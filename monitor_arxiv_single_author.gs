function importRssFeed() {
  const feedUrl = "https://export.arxiv.org/api/query?search_query=au:%22John%20Martinis%22&sortBy=submittedDate&sortOrder=descending&max_results=100"; 
  
  try {
    // 1. Fetch the RSS feed
    const response = UrlFetchApp.fetch(feedUrl);
    const xmlContent = response.getContentText();
    
    // 2. Parse the XML structure
    const document = XmlService.parse(xmlContent);
    const root = document.getRootElement();
    
    // 3. Define the XML namespace for Atom
    const ns = XmlService.getNamespace('http://www.w3.org/2005/Atom');
    const entries = root.getChildren('entry', ns);
    
    const now = new Date();
    const fortyHoursInMs = 40 * 60 * 60 * 1000;
    const matchingEntries = [];
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const updatedText = entry.getChildText('updated', ns);
      
      if (!updatedText) {
        continue;
      }
      
      const updatedDate = new Date(updatedText);
      const timeDifferenceMs = now.getTime() - updatedDate.getTime();
      
      // Check if "updated" is in the past 40 hours (timeDifferenceMs <= fortyHoursInMs)
      // or if it is future-dated (timeDifferenceMs < 0)
      if (timeDifferenceMs <= fortyHoursInMs) {
        const title = entry.getChildText('title', ns).trim().replace(/\s+/g, ' ');
        const summary = entry.getChildText('summary', ns).trim();
        
        // Find the "alternate" link (HTML version)
        let htmlLink = "";
        const links = entry.getChildren('link', ns);
        for (let j = 0; j < links.length; j++) {
          const relAttr = links[j].getAttribute('rel');
          if (relAttr && relAttr.getValue() === 'alternate') {
            const hrefAttr = links[j].getAttribute('href');
            if (hrefAttr) {
              htmlLink = hrefAttr.getValue();
              break;
            }
          }
        }
        
        // Fallback to the ID if no alternate link was specified
        if (!htmlLink) {
          htmlLink = entry.getChildText('id', ns) || "";
        }
        
        matchingEntries.push({
          title: title,
          link: htmlLink,
          summary: summary,
          updated: updatedText
        });
      }
    }
    
    // 4. Send email if there are matching publications
    if (matchingEntries.length > 0) {
      let emailBody = "";
      matchingEntries.forEach((match, index) => {
        emailBody += `Title: ${match.title}\n`;
        emailBody += `Link: ${match.link}\n`;
        emailBody += `Updated: ${match.updated}\n`;
        emailBody += `Summary:\n${match.summary}\n`;
        emailBody += `\n--------------------------------------------------\n\n`;
      });
      
      const myEmail = Session.getActiveUser().getEmail();
      const today = new Date(); 
      const formattedDate = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyy-MM-dd");
      
      MailApp.sendEmail({
        to: myEmail,
        subject: `${formattedDate} - Martinis latest arxiv publications`,
        body: emailBody
      });
      
      Logger.log(`Sent email with ${matchingEntries.length} publications.`);
    } else {
      Logger.log("No new publications found within the specified time window.");
    }
    
  } catch (error) {
    Logger.log("Error processing RSS feed: " + error.toString());
  }
}
