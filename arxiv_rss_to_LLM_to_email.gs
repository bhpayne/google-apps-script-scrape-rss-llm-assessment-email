
function generateRssDigestAndEmail() {
  // Add all of the RSS feeds you want to assess
  const feedUrls = [
    "https://export.arxiv.org/rss/quant-ph"
    //"https://algassert.com/feed.xml",
    //"https://postquantum.com/feed/"
    //"https://www.reddit.com/r/QuantumComputing.rss"
  ];
  
  let aggregatedContent = "Analyze the RSS feed items. Use plain text formatting (no markdown). The audience is a PhD physicist with years of experience in quantum computing architecture. From the XML identify the important advancements in architecture and quantum error correction from at most 3 to 5 papers. Specify the item's title, arxiv URL, creators, and why this paper is included as a recommendation:\n\n";
  

  // 1. Fetch top items from all your feeds
  feedUrls.forEach(url => {
    try {
      const response = UrlFetchApp.fetch(url);
      const xml = response.getContentText();
      const document = XmlService.parse(xml);
      const root = document.getRootElement();
      const channel = root.getChild('channel');
      const items = channel.getChildren('item');
      
      // Define the Dublin Core (dc) namespace for the 'creator' element
      const dcNamespace = XmlService.getNamespace('dc', 'http://purl.org/dc/elements/1.1/');
      
      // Take the top 3 items from each feed to keep the prompt size reasonable
      // 2026-07-01: the daily arxiv RSS has 108,000 tokens from 220 entries :(
      const limit = Math.min(items.length, 30);
      for (let i = 0; i < limit; i++) {
        const item = items[i];
        const title = item.getChildText('title') || "No Title";
        const link = item.getChildText('link') || "No Link";
        const description = item.getChildText('description') || "No Description";
        
        // Retrieve the 'creator' element using the dc namespace
        const creator = item.getChildText('creator', dcNamespace) || "No Creator";
        
        aggregatedContent += `Title: ${title}\nLink: ${link}\nCreator: ${creator}\nDescription: ${description}\n\n`;
      }
    } catch (e) {
      Logger.log("Failed to process feed: " + url + " Error: " + e.toString());
    }
  });



  // 2. Send the content to the Gemini API for assessment
  const geminiApiKey = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // Replace with your AI Studio Key
  let aiAssessment = "";
  
// dashboards for monitoring use:
// https://aistudio.google.com/rate-limit
// https://aistudio.google.com/app/usage

  try {
    aiAssessment = callGemini(aggregatedContent, geminiApiKey);
  } catch (e) {
    Logger.log("Gemini API Error: " + e.toString());
    return;
  }
  
  // 3. Email the assessment to your Gmail account
  const myEmail = Session.getActiveUser().getEmail();

//  MailApp.sendEmail({
//    to: myEmail,
//    subject: "Daily AI RSS Feed Assessment",
//    body: "Here is your automated assessment of the latest RSS updates:\n\n" + aiAssessment
//  });

  // Format today's date as YYYY-MM-DD using the script's timezone
  const today = new Date();
  const formattedDate = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  MailApp.sendEmail({
    to: myEmail,
    subject: `${formattedDate} - arxiv RSS assessment by Gemini`,
    body: "An automated assessment of the latest RSS updates:\n\n" + aiAssessment
  });


}

// Helper function to call the  model
function callGemini(promptText, apiKey) {

// as of 2026-07-01, list of models is on https://ai.google.dev/gemini-api/docs/pricing
//const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;


  const payload = {
    contents: [{
      parts: [{ text: promptText }]
    }]
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  
  if (responseCode !== 200) {
    throw new Error(`API returned code ${responseCode}: ${responseText}`);
  }
  
  const json = JSON.parse(responseText);
  return json.candidates[0].content.parts[0].text;
}
