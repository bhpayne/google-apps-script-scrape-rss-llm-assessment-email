function generateRssDigestAndEmail() {
  const feedUrl = "https://export.arxiv.org/rss/quant-ph";

  // Author list from the old Apps Script
  const authors = [
    'alexei kitaev',
    'austin fowler',
    'craig gidney',
    "Yuval Boger",
    'john martinis',
    'john preskill',
    "Hartmut Neven", 
    "Madelyn Cain", 
    "Jay M. Gambetta",
    'Google quantum'
  ];

  // Keyword list from the old Apps Script
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
    "toffoli"
  ];

  let items = [];
  
  // 1. Fetch items from the feed
  try {
    const response = UrlFetchApp.fetch(feedUrl);
    const xml = response.getContentText();
    const document = XmlService.parse(xml);
    const root = document.getRootElement();
    const channel = root.getChild('channel');
    items = channel.getChildren('item');
    
    // Check if the feed has zero items, and terminate if so
    if (items.length === 0) {
      Logger.log("No items found in the RSS feed. Terminating script.");
      return; 
    }
  } catch (e) {
    Logger.log("Failed to process feed: " + feedUrl + " Error: " + e.toString());
    return; 
  }

  // Define the Dublin Core (dc) namespace for the 'creator' element
  const dcNamespace = XmlService.getNamespace('dc', 'http://purl.org/dc/elements/1.1/');
  const results = [];

  // 2. Evaluate matches for each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = item.getChildText('title') || "No Title";
    const link = item.getChildText('link') || "No Link";
    const description = item.getChildText('description') || "No Description";
    const creator = item.getChildText('creator', dcNamespace) || "No Creator";

    const lowerTitle = title.toLowerCase();
    const lowerDescription = description.toLowerCase();
    const lowerCreator = creator.toLowerCase();

    let matchCount = 0;
    let reasons = [];

    // Check keywords in title and description (as in the old Apps Script)
    for (let k = 0; k < keywords.length; k++) {
      const kw = keywords[k].toLowerCase();
      
      if (lowerTitle.includes(kw)) {
        matchCount++;
        reasons.push(`'${keywords[k]}' in the title`);
      }
      if (lowerDescription.includes(kw)) {
        matchCount++;
        reasons.push(`'${keywords[k]}' in the description`);
      }
    }

    // Check authors
    for (let j = 0; j < authors.length; j++) {
      const author = authors[j].toLowerCase();
      if (lowerCreator.includes(author)) {
        matchCount++;
        reasons.push(`author '${authors[j]}'`);
      }
    }

    // Format the reason string based on match count
    let reasonStr = "";
    if (matchCount > 0) {
      reasonStr = `${matchCount}x: ${reasons.join(" AND ")}`;
    } else {
      reasonStr = "0: no match";
    }

    // Replicate the formatting from the Python script
    const message = `${reasonStr} of ${link}\n"${title}"\nby ${creator}\n\n`;

    results.push({
      matchCount: matchCount,
      message: message
    });
  }

  // 3. Sort results by match count in descending order (highest matches first)
  results.sort((a, b) => b.matchCount - a.matchCount);

  // 4. Construct the email body
  const emailBody = results.map(r => r.message).join("");

  // 5. Send the email if we have output
  if (emailBody.trim().length > 0) {
    const myEmail = Session.getActiveUser().getEmail();
    const recipients = [myEmail, "another@email.domain"].join(",");
    
    MailApp.sendEmail({
      to: recipients,
      subject: "keyword match for arxiv quant-ph from GAS",
      body: emailBody
    });
    Logger.log("Email successfully sent to: " + recipients);
  } else {
    Logger.log("No content to email.");
  }
}
