function importRssFeed() {
  // Replace this URL with the RSS feed you wish to read
  const feedUrl = "https://www.reddit.com/r/QuantumComputing/new/.rss?sort=new"; 
  
  try {
    // 1. Fetch the RSS feed
    const response = UrlFetchApp.fetch(feedUrl);
    const xmlContent = response.getContentText();
    
    // 2. Parse the XML structure
    const document = XmlService.parse(xmlContent);
    const root = document.getRootElement();    
    
    // Define the Atom namespace used in the XML document
    const atomNs = XmlService.getNamespace("http://www.w3.org/2005/Atom");
    
    // Retrieve all entry elements
    const entries = root.getChildren("entry", atomNs);
    
    // Determine the threshold for "past 40 hours" in milliseconds
    const fortyHoursInMs = 40 * 60 * 60 * 1000;
    const now = new Date();
    const cutoffTime = now.getTime() - fortyHoursInMs;
    
    const matchingEntries = [];
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const updatedStr = entry.getChildText("updated", atomNs);
      
      if (updatedStr) {
        const updatedDate = new Date(updatedStr);
        
        // Checking if the date is valid before comparing
        if (!isNaN(updatedDate.getTime())) {
          // If the entry date is greater than or equal to the cutoff, 
          // it is either within the past 40 hours or future-dated.
          if (updatedDate.getTime() >= cutoffTime) {
            const title = entry.getChildText("title", atomNs) || "No Title";
            const linkElement = entry.getChild("link", atomNs);
            const link = linkElement ? linkElement.getAttribute("href").getValue() : "";
            
            matchingEntries.push({
              title: title,
              link: link
            });
          }
        }
      }
    }
    
    // Send an email only if matching entries exist
    if (matchingEntries.length > 0) {
      let emailBody = "Here are updates from the past 40 hours:\n\n";
      matchingEntries.forEach(item => {
        emailBody += `Title: ${item.title}\nLink: ${item.link}\n\n`;
      });
      
      const myEmail = Session.getActiveUser().getEmail();
      const today = new Date(); 
      const formattedDate = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");
      
      MailApp.sendEmail({
        to: myEmail,
        subject: `${formattedDate} - reddit.com/r/QuantumComputing RSS latest update`,
        body: emailBody
      });
    }
    
  } catch (error) {
    Logger.log("An error occurred: " + error.toString());
  }
}
