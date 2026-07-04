function generateRssDigestAndEmail() {
  // Add all of the RSS feeds you want to assess
  const feedUrls = [
    "https://scottaaronson.blog/?feed=rss2",
    "https://algassert.com/feed.xml",
    "https://postquantum.com/feed/",
    "https://blog.google/innovation-and-ai/models-and-research/quantum-computing/rss/"
    //"https://www.reddit.com/r/QuantumComputing.rss"
  ];
  
  let aggregatedContent = "Analyze the RSS items. Your audience is a PhD Physicist with years of experience in quantum computing. Identify the one most important update specific to quantum computing. Format the response as plain text (no markdown):\n\n";
  
  // 1. Fetch top items from all your feeds
  feedUrls.forEach(url => {
    try {
      const response = UrlFetchApp.fetch(url);
      const xml = response.getContentText();
      const document = XmlService.parse(xml);
      const root = document.getRootElement();
      const channel = root.getChild('channel');
      const items = channel.getChildren('item');
      
      // Take the top 3 items from each feed to keep the prompt size reasonable
      const limit = Math.min(items.length, 3);
      for (let i = 0; i < limit; i++) {
        const item = items[i];
        const title = item.getChildText('title') || "No Title";
        const description = item.getChildText('description') || "No Description";
        aggregatedContent += `Title: ${title}\nDescription: ${description}\n\n`;
      }
    } catch (e) {
      Logger.log("Failed to process feed: " + url + " Error: " + e.toString());
    }
  });
  
  // 2. Send the content to the Gemini API for assessment
  const geminiApiKey = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // Replace with your AI Studio Key
  let aiAssessment = "";
  
  try {
    aiAssessment = callGemini(aggregatedContent, geminiApiKey);
  } catch (e) {
    Logger.log("Gemini API Error: " + e.toString());
    return;
  }
  
  // 3. Email the assessment to your Gmail account
  const myEmail = Session.getActiveUser().getEmail();


  // Format today's date as YYYY-MM-DD using the script's timezone
  const today = new Date();
  const formattedDate = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  MailApp.sendEmail({
    to: myEmail,
    subject: `${formattedDate} - Assessment of multiple RSS feeds by Gemini`,
    body: "An automated assessment of the latest RSS updates:\n\n" + aiAssessment
  });


}

// Helper function to call the  model
function callGemini(promptText, apiKey) {

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
