function sendHackerNewsDigest() {
  const recipientEmail = Session.getActiveUser().getEmail();
  
  if (!recipientEmail) {
    Logger.log("Recipient email could not be determined. Please hardcode your email address in the configuration variable.");
    return;
  }
  
  const hoursAgo = 48; // Change this if you adjust your trigger timing
  const targetTimeSec = Math.floor(Date.now() / 1000) - (hoursAgo * 60 * 60);
  const baseUrl = "https://hacker-news.firebaseio.com/v0";
  
  // Define the target keywords
  const keywords = ["quantum comput", "ftqc", "quera", "psiquantum", "oratomic", "quantum archit", "preskill", "gidney", "quantum error", "logical qubit"];
  
  try {
    // Fetch the list of newest story IDs
    const response = UrlFetchApp.fetch(`${baseUrl}/newstories.json`);
    const storyIds = JSON.parse(response.getContentText());
    
    const stories = [];
    const batchSize = 40; // Fetch in batches of 40 to avoid hitting limits
    let index = 0;
    let withinTimeRange = true;
    
    // Fetch story details in parallel batches
    while (withinTimeRange && index < storyIds.length) {
      const batchIds = storyIds.slice(index, index + batchSize);
      const requests = batchIds.map(id => ({
        url: `${baseUrl}/item/${id}.json`,
        muteHttpExceptions: true
      }));
      
      const responses = UrlFetchApp.fetchAll(requests);
      
      for (let i = 0; i < responses.length; i++) {
        const res = responses[i];
        if (res.getResponseCode() === 200) {
          const item = JSON.parse(res.getContentText());
          
          if (item && item.type === "story") {
            if (item.time >= targetTimeSec) {
              
              // Constraint 1: Check if 'title' or 'url' contains any of the target keywords (case-insensitive)
              const titleText = (item.title || "").toLowerCase();
              const urlText = (item.url || "").toLowerCase();
              const hasKeyword = keywords.some(keyword => titleText.includes(keyword) || urlText.includes(keyword));
              
              // Constraint 2: Check if descendants (comment count) is greater than 1
              const commentCount = item.descendants || 0;
              const hasMinComments = commentCount > 1;
              
              // Only push the story if both constraints are met
              if (hasKeyword && hasMinComments) {
                stories.push(item);
              }
              
            } else {
              // Since newstories.json is ordered newest to oldest,
              // we stop processing once we find an item older than our threshold.
              withinTimeRange = false;
              break;
            }
          }
        }
      }
      index += batchSize;
    }
    
    // Email compilation and transmission
    if (stories.length === 0) {
      Logger.log("No stories found matching your criteria in the past " + hoursAgo + " hours.");
      return;
    }
    
    const subject = `Hacker News Digest - Past ${hoursAgo} Hours (${stories.length} Stories)`;
    let htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #ff6600; border-bottom: 2px solid #ff6600; padding-bottom: 8px; margin-bottom: 16px;">
          Hacker News Stories (Past ${hoursAgo} Hours)
        </h2>
        <ul style="list-style-type: none; padding-left: 0;">
    `;
    
    stories.forEach(story => {
      const title = story.title;
      // Handle Ask HN / Show HN text posts that do not have an external URL
      const url = story.url || `https://news.ycombinator.com/item?id=${story.id}`;
      const score = story.score || 0;
      const author = story.by || "unknown";
      const commentsCount = story.descendants || 0;
      const commentsUrl = `https://news.ycombinator.com/item?id=${story.id}`;
      const postTime = new Date(story.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      htmlBody += `
        <li style="margin-bottom: 18px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
          <a href="${url}" style="font-size: 1.1em; color: #0000ee; text-decoration: none; font-weight: bold;" target="_blank">${title}</a><br>
          <span style="color: #666; font-size: 0.85em; display: inline-block; margin-top: 4px;">
            ${score} points by ${author} | 
            <a href="${commentsUrl}" style="color: #ff6600; text-decoration: none;" target="_blank">${commentsCount} comments</a> | 
            Posted at ${postTime}
          </span>
        </li>
      `;
    });
    
    htmlBody += `
        </ul>
      </div>
    `;
    
    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      htmlBody: htmlBody
    });
    
    Logger.log(`Successfully emailed ${stories.length} stories to ${recipientEmail}.`);
    
  } catch (error) {
    Logger.log("An error occurred: " + error.toString());
  }
}
