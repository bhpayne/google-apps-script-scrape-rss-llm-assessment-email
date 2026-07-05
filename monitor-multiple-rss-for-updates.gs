function importRssFeeds() {
  // this script assumes the RSS feed contains the following:
  //<item>
  //   <title>
  //   <link>
  //   <pubDate>

  // Define the list of RSS feeds you wish to monitor
  const feeds = [
    { name: "Gidney's Blog", url: "https://algassert.com/feed.xml" },
    { name: "Scott Aaronson's Blog'", url: "https://scottaaronson.blog/?feed=rss2" },
    { name: "Post Quantum", url: "https://postquantum.com/feed/" },
    { name: "Google Quantum Blog", url: "https://blog.google/innovation-and-ai/models-and-research/quantum-computing/rss/"}
  ];
  
  // Get current time and compute the timestamp for 40 hours ago
  const now = new Date();
  const fortyHoursInMs = 40 * 60 * 60 * 1000;
  const thresholdTime = now.getTime() - fortyHoursInMs;
  
  // Array to hold matching items grouped by feed name
  const allMatches = [];
  
  // Loop through each feed
  for (const feed of feeds) {
    try {
      // 1. Fetch the RSS feed
      const response = UrlFetchApp.fetch(feed.url);
      const xmlContent = response.getContentText();
      
      // 2. Parse the XML structure
      const document = XmlService.parse(xmlContent);
      const root = document.getRootElement();
      const channel = root.getChild('channel');
      
      if (!channel) {
        Logger.log(`Could not find channel element for "${feed.name}". This might not be a standard RSS 2.0 feed.`);
        continue;
      }
      
      const items = channel.getChildren('item');
      const feedMatches = [];
      
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
            Logger.log(`Skipping item in "${feed.name}" with invalid date: "${pubDateStr}"`);
            continue;
          }
          
          // Match if the pubDate is within the last 40 hours or is in the future
          if (pubDate.getTime() >= thresholdTime) {
            feedMatches.push({
              title: title,
              link: link,
              pubDate: pubDateStr
            });
          }
        }
      }
      
      // If matches were found for this specific feed, record them
      if (feedMatches.length > 0) {
        allMatches.push({
          feedName: feed.name,
          items: feedMatches
        });
      }
      
    } catch (e) {
      // Individual feed error handling so other feeds still run if one fails
      Logger.log(`Error processing feed "${feed.name}": ` + e.toString());
    }
  }
  
  // Only send an email if matching items were found in at least one feed
  if (allMatches.length > 0) {
    let emailBody = "The following matches were found in your monitored RSS feeds:\n\n";
    let totalItemsCount = 0;
    
    allMatches.forEach(feedMatch => {
      emailBody += `=== ${feedMatch.feedName} ===\n`;
      feedMatch.items.forEach(item => {
        emailBody += `Title: ${item.title}\n`;
        emailBody += `Link: ${item.link}\n`;
        emailBody += `Published: ${item.pubDate}\n\n`;
        totalItemsCount++;
      });
      emailBody += "\n";
    });
    
    const myEmail = Session.getActiveUser().getEmail();
    const today = new Date(); 
    const formattedDate = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");
    
    MailApp.sendEmail({
      to: myEmail,
      subject: `${formattedDate} - RSS Feed Updates`,
      body: emailBody
    });
    
    Logger.log(`Sent email with ${totalItemsCount} items to ${myEmail}.`);
  } else {
    Logger.log("No items matched the criteria of being within the past 40 hours or future-dated across any feed.");
  }
}
