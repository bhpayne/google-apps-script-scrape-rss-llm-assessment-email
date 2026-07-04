function importRssFeed() {
  // Replace this URL with the RSS feed you wish to read
  const feedUrl = "https://algassert.com/feed.xml"; 
  
  try {
    // 1. Fetch the RSS feed
    const response = UrlFetchApp.fetch(feedUrl);
    const xmlContent = response.getContentText();
    
    // 2. Parse the XML structure
    const document = XmlService.parse(xmlContent);
    const root = document.getRootElement();
    const channel = root.getChild('channel');
    
    if (!channel) {
      Logger.log("Could not find channel element. This might not be a standard RSS 2.0 feed.");
      return;
    }
    
    const items = channel.getChildren('item');
    
    // Get current time and compute the timestamp for 40 hours ago
    const now = new Date();
    const fortyHoursInMs = 40 * 60 * 60 * 1000;
    const thresholdTime = now.getTime() - fortyHoursInMs;
    
    const matchingItems = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      const titleElement = item.getChild('title');
      const linkElement = item.getChild('link');
      const pubDateElement = item.getChild('pubDate');
      
      if (titleElement && linkElement && pubDateElement) {
        const title = titleElement.getText();
        const link = linkElement.getText();
        const pubDateStr = pubDateElement.getText();
        
        // Convert the pubDate string to a JavaScript Date object
        const pubDate = new Date(pubDateStr);
        
        // Skip if the parsed date is invalid
        if (isNaN(pubDate.getTime())) {
          Logger.log(`Skipping item with invalid date: "${pubDateStr}"`);
          continue;
        }
        
        // Match if the pubDate is within the last 40 hours or is in the future
        if (pubDate.getTime() >= thresholdTime) {
          matchingItems.push({
            title: title,
            link: link,
            pubDate: pubDateStr
          });
        }
      }
    }
    
    // Only send an email if matching items were found
    if (matchingItems.length > 0) {
      let emailBody = "The following matches were found in Gidney's RSS feed:\n\n";
      
      matchingItems.forEach(item => {
        emailBody += `Title: ${item.title}\n`;
        emailBody += `Link: ${item.link}\n`;
        emailBody += `Published: ${item.pubDate}\n\n`;
      });
      
      const myEmail = Session.getActiveUser().getEmail();
      const today = new Date(); 
      const formattedDate = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");
      
      MailApp.sendEmail({
        to: myEmail,
        subject: `${formattedDate} - Gidney's latest update (from RSS)`,
        body: emailBody
      });
      
      Logger.log(`Sent email with ${matchingItems.length} items to ${myEmail}.`);
    } else {
      Logger.log("No items matched the criteria of being within the past 40 hours or future-dated.");
    }
    
  } catch (e) {
    Logger.log("Error occurred: " + e.toString());
  }
}
