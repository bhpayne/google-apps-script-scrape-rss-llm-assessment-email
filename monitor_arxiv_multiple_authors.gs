function importRssFeed() {
  const authors = ["John Martinis", "Craig Gidney", "Hartmut Neven", "Madelyn Cain", "Jay M. Gambetta"];
  const uniqueEntries = new Map();
  const now = new Date();
  const fortyHoursInMs = 40 * 60 * 60 * 1000;
  
  for (let i = 0; i < authors.length; i++) {
    const author = authors[i];
    const encodedAuthor = encodeURIComponent(`"${author}"`);
    const feedUrl = `https://export.arxiv.org/api/query?search_query=au:${encodedAuthor}&sortBy=submittedDate&sortOrder=descending&max_results=100`;
    
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
      
      for (let j = 0; j < entries.length; j++) {
        const entry = entries[j];
        const updatedText = entry.getChildText('updated', ns);
        
        if (!updatedText) {
          continue;
        }
        
        const updatedDate = new Date(updatedText);
        const timeDifferenceMs = now.getTime() - updatedDate.getTime();
        
        // Check if "updated" is in the past 40 hours (timeDifferenceMs <= fortyHoursInMs)
        // or if it is future-dated (timeDifferenceMs < 0)
        if (timeDifferenceMs <= fortyHoursInMs) {
          const entryId = entry.getChildText('id', ns) || "";
          
          // Deduplicate based on unique arXiv ID
          if (uniqueEntries.has(entryId)) {
            continue;
          }
          
          const title = entry.getChildText('title', ns).trim().replace(/\s+/g, ' ');
          const summary = entry.getChildText('summary', ns).trim();
          
          // Find the "alternate" link (HTML version)
          let htmlLink = "";
          const links = entry.getChildren('link', ns);
          for (let k = 0; k < links.length; k++) {
            const relAttr = links[k].getAttribute('rel');
            if (relAttr && relAttr.getValue() === 'alternate') {
              const hrefAttr = links[k].getAttribute('href');
              if (hrefAttr) {
                htmlLink = hrefAttr.getValue();
                break;
              }
            }
          }
          
          // Fallback to the ID if no alternate link was specified
          if (!htmlLink) {
            htmlLink = entryId;
          }
          
          uniqueEntries.set(entryId, {
            title: title,
            link: htmlLink,
            summary: summary,
            updated: updatedText,
            updatedDate: updatedDate
          });
        }
      }
      
      Logger.log(`Processed feed for author: ${author}`);
      
    } catch (error) {
      Logger.log(`Error processing RSS feed for ${author}: ` + error.toString());
    }
    
    // Respect arXiv's API user guidelines (3-second delay between queries)
    if (i < authors.length - 1) {
      Utilities.sleep(3000);
    }
  }
  
  // 4. Send email if there are matching publications
  if (uniqueEntries.size > 0) {
    // Convert Map back to array and sort by update date descending
    const sortedEntries = Array.from(uniqueEntries.values())
      .sort((a, b) => b.updatedDate.getTime() - a.updatedDate.getTime());
      
    let emailBody = "";
    sortedEntries.forEach((match) => {
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
      subject: `${formattedDate} - Latest arXiv publications updates`,
      body: emailBody
    });
    
    Logger.log(`Sent email with ${sortedEntries.length} aggregated publications.`);
  } else {
    Logger.log("No new publications found within the specified time window.");
  }
}
