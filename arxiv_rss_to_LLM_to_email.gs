function generateRssDigestAndEmail() {
  const feedUrl = "https://export.arxiv.org/rss/quant-ph";

  const authors = ['alexei kitaev',
    'austin fowler',
    'craig gidney',
    "Yuval Boger",
    'john martinis',
    'john preskill',
    "Hartmut Neven", 
    "Madelyn Cain", 
    "Jay M. Gambetta",
    'Google quantum',];

  const keywords = [
    "asic",
    "benchmark",
    "bicycle code",
    "calibrate",
    "calibration",
    "characterization",
    "characterize",
    "circuit quantum electrodynamics",
    "circuit",
    "clifford",
    "coherent error",
    "correlated error",
    "cqed",
    "decode",
    "fpga",
    "gross code",
    "magic state",
    "markovian",
    "neutral atom",
    "noise",
    "noisy",
    "pauli",
    "photonic interconnect",
    "photonic qubit",
    "qec Codes",
    "qldpc",
    "quantum comput",
    "quantum error correction",
    "quantum software",
    "qubit",
    "simulator",
    "superconducting resonator",
    "surface code",
    "syndrome measurement",
    "toffoli",];
  
  const promptHeader = "Analyze the RSS feed items. Use plain text formatting (no markdown). The audience is a PhD physicist with years of experience in quantum computing architecture. From the XML identify the important advancements in architecture and quantum error correction from at most 3 to 5 papers. Specify the item's title, arxiv URL, creators, and why this paper is included as a recommendation:\n\n";
  let aggregatedContent = promptHeader;
  
  let matchedItemsContent = "";
  let itemsForLLMCount = 0;
  let matchedItemsCount = 0;
  
  // 1. Fetch items from your feed
  try {
    const response = UrlFetchApp.fetch(feedUrl);
    const xml = response.getContentText();
    const document = XmlService.parse(xml);
    const root = document.getRootElement();
    const channel = root.getChild('channel');
    const items = channel.getChildren('item');
    
    // Check if the feed has zero items, and terminate if so
    if (items.length === 0) {
      Logger.log("No items found in the RSS feed. Terminating script.");
      return; 
    }

    // Define the Dublin Core (dc) namespace for the 'creator' element
    const dcNamespace = XmlService.getNamespace('dc', 'http://purl.org/dc/elements/1.1/');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const title = item.getChildText('title') || "No Title";
      const link = item.getChildText('link') || "No Link";
      const description = item.getChildText('description') || "No Description";
      
      // Retrieve the 'creator' element using the dc namespace
      const creator = item.getChildText('creator', dcNamespace) || "No Creator";
      
      // Check if the 'creator' string contains any of the names in the authors list
      let isAuthorMatch = false;
      for (let j = 0; j < authors.length; j++) {
        if (creator.toLowerCase().includes(authors[j].toLowerCase())) {
          isAuthorMatch = true;
          break;
        }
      }
      
      const itemString = `Title: ${title}\nLink: ${link}\nCreator: ${creator}\nDescription: ${description}\n\n`;
      
      if (isAuthorMatch) {
        matchedItemsContent += itemString;
        matchedItemsCount++;
      } else {
        // If not an author match, check if title or description contains any of the keywords
        let isKeywordMatch = false;
        const lowerTitle = title.toLowerCase();
        const lowerDescription = description.toLowerCase();
        
        for (let k = 0; k < keywords.length; k++) {
          const kw = keywords[k].toLowerCase();
          if (lowerTitle.includes(kw) || lowerDescription.includes(kw)) {
            isKeywordMatch = true;
            break;
          }
        }
        
        if (isKeywordMatch) {
          aggregatedContent += itemString;
          itemsForLLMCount++;
        }
      }
    }
  } catch (e) {
    Logger.log("Failed to process feed: " + feedUrl + " Error: " + e.toString());
    return; // Terminate script execution if the fetch or parse failed
  }

  // 2. Send the content to the Gemini API for assessment if there are items to assess
  const geminiApiKey = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // Replace with your AI Studio Key
  let aiAssessment = "";
  
  if (itemsForLLMCount > 0) {
    try {
      aiAssessment = callGemini(aggregatedContent, geminiApiKey);
    } catch (e) {
      Logger.log("Gemini API Error: " + e.toString());
      aiAssessment = "Error retrieving Gemini assessment: " + e.toString();
    }
  } else {
    aiAssessment = "No remaining papers to assess.";
  }
  
  // 3. Construct and email the assessment to your Gmail account
  const myEmail = Session.getActiveUser().getEmail();
  const today = new Date(); // Format today's date as YYYY-MM-DD using the script's timezone
  const formattedDate = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  let emailBody = "";
  
  // If there are papers matching your authors, list them at the top of the email
  if (matchedItemsCount > 0) {
    emailBody += `=== WATCHLIST AUTHOR MATCHES (${matchedItemsCount}) ===\n`;
    emailBody += "These papers matched your author list and were excluded from AI assessment:\n\n";
    emailBody += matchedItemsContent;
    emailBody += "========================================\n\n";
  }
  
  emailBody += "=== AI RSS FEED ASSESSMENT ===\n\n" + aiAssessment;

  MailApp.sendEmail({
    to: myEmail,
    subject: `${formattedDate} - arxiv RSS assessment by Gemini`,
    body: emailBody
  });
}

// Helper function to call the model
function callGemini(promptText, apiKey) {
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
