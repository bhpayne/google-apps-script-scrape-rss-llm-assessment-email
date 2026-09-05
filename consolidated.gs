/**
 * Daily Quantum & Computing Digest
 * Consolidated Google Apps Script
 */

// ================= CONFIGURATION =================

const CONFIG = {
  // Recipients
  extraRecipients: [
    "bpayne@lps.umd.edu",
    "bhpayne@nsa.gov"
  ],

  // Gemini API Configuration
  geminiApiKey: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Replace with your key if needed
  geminiModel: "gemini-3.1-flash-lite",

  // Time Thresholds (in hours)
  blogHours: 40,
  redditHours: 40,
  hnHours: 48,

  // Feed URLs
  arxivFeedUrl: "https://export.arxiv.org/rss/quant-ph",
  redditFeedUrl: "https://www.reddit.com/r/QuantumComputing/new/.rss?sort=new",
  blogFeeds: [
    { name: "Gidney's Blog", url: "https://algassert.com/feed.xml" },
    { name: "Scott Aaronson's Blog", url: "https://scottaaronson.blog/?feed=rss2" },
    { name: "Post Quantum", url: "https://postquantum.com/feed/" },
    { name: "Google Quantum Blog", url: "https://blog.google/innovation-and-ai/models-and-research/quantum-computing/rss/" }
  ],

  // Single Author Watchlist
  authors: [
    "alexei kitaev",
    "sergio boixo",
    "austin fowler",
    "craig gidney",
    "Yuval Boger",
    "john martinis",
    "john preskill",
    "Hartmut Neven",
    "Madelyn Cain",
    "Jay M. Gambetta",
    "Mark Saffman",
    "Google quantum"
  ],

  // Single arXiv Keyword List
  arxivKeywords: [
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
    "crqc",
    "cryptanalytic",
    "crypt-analytic",
    "decode",
    "decoding",
    "error correct",
    "fault-tolerant quantum computer",
    "fault tolerant quantum computer",
    "fpga",
    "ftqc",
    "gidney",
    "gross code",
    "logical qubit",
    "magic state",
    "markovian",
    "neutral atom",
    "noise",
    "noisy",
    "oratomic",
    "pauli",
    "photonic interconnect",
    "photonic qubit",
    "preskill",
    "psiquantum",
    "qec Codes",
    "qldpc",
    "quantum archit",
    "quantum comput",
    "quantum error correction",
    "quantum error",
    "quantum software",
    "quantum",
    "qubit",
    "quera",
    "simulator",
    "software",
    "superconducting resonator",
    "surface code",
    "syndrome measurement",
    "toffoli"
  ],

  // Dedicated Hacker News Keyword List
  hnKeywords: [
    "fable",
    "anthropic",
    "astra",
    "prompt"
  ]
};

// ================= MAIN EXECUTION =================

function sendDailyDigest() {
  const errors = [];
  const sections = [];

  // --- 1. Fetch Blogs ---
  const blogUpdates = fetchBlogUpdates(errors);

  // --- 2, 3, 6, 7. Fetch and Process arXiv (Authors, Keywords, Gemini) ---
  const arxivData = processArxivFeed(errors);

  // --- 4. Fetch Hacker News ---
  const hnMatches = fetchHackerNews(errors);

  // --- 5. Fetch Reddit ---
  const redditMatches = fetchRedditPosts(errors);

  // ================= CONSTRUCT EMAIL SECTIONS =================

  // Section 1: New blog updates
  if (blogUpdates.length > 0) {
    let sec1 = "=== 1. BLOG UPDATES ===\n\n";
    blogUpdates.forEach(b => {
      sec1 += `[${b.feedName}]\n`;
      sec1 += `Title: ${b.title}\n`;
      sec1 += `URL: ${b.link}\n`;
      sec1 += `Published: ${b.pubDate}\n\n`;
    });
    sections.push(sec1.trim());
  }

  // Section 2: Author name matches from arXiv
  if (arxivData.authorMatches.length > 0) {
    let sec2 = `=== 2. ARXIV AUTHOR MATCHES (${arxivData.authorMatches.length}) ===\n\n`;
    arxivData.authorMatches.forEach(item => {
      sec2 += `1) URL: ${item.link}\n`;
      sec2 += `2) Title: ${item.title}\n`;
      sec2 += `3) Authors: ${item.authors}\n`;
      sec2 += `4) Triggered by Author: ${item.matchedAuthors.join(", ")}\n\n`;
    });
    sections.push(sec2.trim());
  }

  // Section 3: arXiv keyword matches (> 5 matches)
  if (arxivData.keywordHigh.length > 0) {
    let sec3 = `=== 3. ARXIV HIGH KEYWORD MATCHES (> 5 matches) (${arxivData.keywordHigh.length}) ===\n\n`;
    arxivData.keywordHigh.forEach(item => {
      sec3 += `1) URL: ${item.link}\n`;
      sec3 += `2) Title: ${item.title}\n`;
      sec3 += `3) Authors: ${item.authors}\n`;
      sec3 += `4) Matched Keywords (${item.totalHits} occurrences): ${item.matchedKeywords.join(", ")}\n\n`;
    });
    sections.push(sec3.trim());
  }

  // Section 4: Hacker News keyword matches
  if (hnMatches.length > 0) {
    let sec4 = `=== 4. HACKER NEWS MATCHES (${hnMatches.length}) ===\n\n`;
    hnMatches.forEach(hn => {
      sec4 += `1) URL: ${hn.url}\n`;
      sec4 += `2) Title: ${hn.title}\n`;
      sec4 += `3) Author/By: ${hn.by} (${hn.score} points | ${hn.descendants} comments)\n`;
      sec4 += `4) Matched Keywords: ${hn.matchedKeywords.join(", ")}\n\n`;
    });
    sections.push(sec4.trim());
  }

  // Section 5: Latest posts from Reddit
  if (redditMatches.length > 0) {
    let sec5 = `=== 5. REDDIT /r/QuantumComputing LATEST POSTS (${redditMatches.length}) ===\n\n`;
    redditMatches.forEach(r => {
      sec5 += `Title: ${r.title}\n`;
      sec5 += `URL: ${r.link}\n\n`;
    });
    sections.push(sec5.trim());
  }

  // Section 6: AI recommendations
  if (arxivData.aiRecommendation && arxivData.aiRecommendation.trim().length > 0) {
    let sec6 = "=== 6. AI RECOMMENDATIONS (GEMINI) ===\n\n";
    sec6 += arxivData.aiRecommendation.trim() + "\n";
    sections.push(sec6.trim());
  }

  // Section 7: arXiv keyword matches (<= 5 matches)
  if (arxivData.keywordLow.length > 0) {
    let sec7 = `=== 7. ARXIV KEYWORD MATCHES (<= 5 matches) (${arxivData.keywordLow.length}) ===\n\n`;
    arxivData.keywordLow.forEach(item => {
      sec7 += `1) URL: ${item.link}\n`;
      sec7 += `2) Title: ${item.title}\n`;
      sec7 += `3) Authors: ${item.authors}\n`;
      sec7 += `4) Matched Keywords (${item.totalHits} occurrences): ${item.matchedKeywords.join(", ")}\n\n`;
    });
    sections.push(sec7.trim());
  }

  // Errors section if any were encountered
  if (errors.length > 0) {
    let errSec = "=== [ERRORS & WARNINGS ENCOUNTERED] ===\n\n";
    errors.forEach(err => {
      errSec += `* ${err}\n`;
    });
    sections.push(errSec.trim());
  }

  // ================= SEND EMAIL =================

  if (sections.length === 0) {
    Logger.log("No new updates found across any source today.");
    return;
  }

  const finalBody = sections.join("\n\n" + "=".repeat(40) + "\n\n");
  
  // Combine recipients and remove duplicates
  const myEmail = Session.getActiveUser().getEmail();
  const allRecipients = Array.from(new Set([myEmail, ...CONFIG.extraRecipients]))
    .filter(email => email && email.trim().length > 0)
    .join(",");

  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const subject = `${todayStr} - Daily Digest`;

  MailApp.sendEmail({
    to: allRecipients,
    subject: subject,
    body: finalBody
  });

  Logger.log(`Consolidated digest successfully sent to: ${allRecipients}`);
}

// ================= HELPER FUNCTIONS =================

/**
 * 1. Fetch updates from monitored RSS Blogs
 */
function fetchBlogUpdates(errors) {
  const matches = [];
  const cutoffTime = Date.now() - (CONFIG.blogHours * 60 * 60 * 1000);

  for (const feed of CONFIG.blogFeeds) {
    try {
      const response = UrlFetchApp.fetch(feed.url, { muteHttpExceptions: true });
      if (response.getResponseCode() !== 200) {
        throw new Error(`HTTP code ${response.getResponseCode()}`);
      }
      const document = XmlService.parse(response.getContentText());
      const root = document.getRootElement();
      const channel = root.getChild("channel");
      if (!channel) continue;

      const items = channel.getChildren("item");
      for (const item of items) {
        const titleElem = item.getChild("title");
        const linkElem = item.getChild("link");
        const pubDateElem = item.getChild("pubDate");

        if (titleElem && linkElem && pubDateElem) {
          const pubDateStr = pubDateElem.getText();
          const pubDate = new Date(pubDateStr);

          if (!isNaN(pubDate.getTime()) && pubDate.getTime() >= cutoffTime) {
            matches.push({
              feedName: feed.name,
              title: titleElem.getText().trim(),
              link: linkElem.getText().trim(),
              pubDate: pubDateStr.trim()
            });
          }
        }
      }
    } catch (e) {
      errors.push(`Error fetching Blog [${feed.name}]: ${e.message}`);
    }
  }
  return matches;
}

/**
 * 2, 3, 6, 7. Process arXiv feed
 */
function processArxivFeed(errors) {
  const result = {
    authorMatches: [],
    keywordHigh: [],
    keywordLow: [],
    aiRecommendation: ""
  };

  let items = [];
  const dcNamespace = XmlService.getNamespace("dc", "http://purl.org/dc/elements/1.1/");

  try {
    const response = UrlFetchApp.fetch(CONFIG.arxivFeedUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      throw new Error(`arXiv returned HTTP ${response.getResponseCode()}`);
    }
    const document = XmlService.parse(response.getContentText());
    const channel = document.getRootElement().getChild("channel");
    if (channel) {
      items = channel.getChildren("item");
    }
  } catch (e) {
    errors.push(`Error fetching arXiv quant-ph: ${e.message}`);
    return result;
  }

  const papersForGemini = [];

  for (const item of items) {
    const title = (item.getChildText("title") || "No Title").trim();
    const link = (item.getChildText("link") || "No Link").trim();
    const description = (item.getChildText("description") || "").trim();
    const creator = (item.getChildText("creator", dcNamespace) || "No Creator").trim();

    const lowerTitle = title.toLowerCase();
    const lowerDesc = description.toLowerCase();
    const lowerCreator = creator.toLowerCase();

    // Check author watchlist
    const matchedAuthors = [];
    for (const author of CONFIG.authors) {
      if (lowerCreator.includes(author.toLowerCase())) {
        matchedAuthors.push(author);
      }
    }

    if (matchedAuthors.length > 0) {
      // Author match only (excluded from keyword sections and AI assessment)
      result.authorMatches.push({
        title: title,
        link: link,
        authors: creator,
        matchedAuthors: matchedAuthors
      });
      continue;
    }

    // Check keywords (title & description)
    let totalHits = 0;
    const matchedKeywordsSet = new Set();

    for (const kw of CONFIG.arxivKeywords) {
      const kwLower = kw.toLowerCase();
      let hitInPaper = false;

      if (lowerTitle.includes(kwLower)) {
        totalHits++;
        hitInPaper = true;
      }
      if (lowerDesc.includes(kwLower)) {
        totalHits++;
        hitInPaper = true;
      }

      if (hitInPaper) {
        matchedKeywordsSet.add(kw);
      }
    }

    // Only process if at least 1 keyword matched
    if (totalHits > 0) {
      const matchedKeywordsArray = Array.from(matchedKeywordsSet);
      const paperObj = {
        title: title,
        link: link,
        authors: creator,
        totalHits: totalHits,
        matchedKeywords: matchedKeywordsArray,
        description: description
      };

      // Feed to Gemini candidate list
      papersForGemini.push(paperObj);

      if (totalHits > 5) {
        result.keywordHigh.push(paperObj);
      } else {
        result.keywordLow.push(paperObj);
      }
    }
  }

  // Sort keyword matches descending by total match count
  result.keywordHigh.sort((a, b) => b.totalHits - a.totalHits);
  result.keywordLow.sort((a, b) => b.totalHits - a.totalHits);

  // AI assessment on keyword papers
  if (papersForGemini.length > 0) {
    try {
      const promptHeader = "Analyze the RSS feed items. Use plain text formatting (no markdown symbols like asterisks, hashes, or bullet stars). The audience is a PhD physicist with years of experience in quantum computing architecture. From the list below identify the important advancements in architecture and quantum error correction from at most 3 to 5 papers. Specify the item's title, arxiv URL, creators, and why this paper is included as a recommendation:\n\n";
      
      let aggregatedContent = promptHeader;
      papersForGemini.forEach(p => {
        aggregatedContent += `Title: ${p.title}\nLink: ${p.link}\nCreator: ${p.authors}\nDescription: ${p.description}\n\n`;
      });

      result.aiRecommendation = callGemini(aggregatedContent);
    } catch (e) {
      errors.push(`Error generating AI assessment: ${e.message}`);
      result.aiRecommendation = `AI assessment failed: ${e.message}`;
    }
  }

  return result;
}

/**
 * 4. Fetch Hacker News keyword matches
 */
function fetchHackerNews(errors) {
  const matches = [];
  const targetTimeSec = Math.floor(Date.now() / 1000) - (CONFIG.hnHours * 60 * 60);
  const baseUrl = "https://hacker-news.firebaseio.com/v0";

  try {
    const res = UrlFetchApp.fetch(`${baseUrl}/newstories.json`, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      throw new Error(`HN API returned HTTP ${res.getResponseCode()}`);
    }
    const storyIds = JSON.parse(res.getContentText());
    const batchSize = 40;
    let index = 0;
    let withinRange = true;

    while (withinRange && index < storyIds.length && index < 200) {
      const batchIds = storyIds.slice(index, index + batchSize);
      const requests = batchIds.map(id => ({
        url: `${baseUrl}/item/${id}.json`,
        muteHttpExceptions: true
      }));

      const responses = UrlFetchApp.fetchAll(requests);
      for (const r of responses) {
        if (r.getResponseCode() === 200) {
          const item = JSON.parse(r.getContentText());
          if (item && item.type === "story") {
            if (item.time >= targetTimeSec) {
              const titleText = (item.title || "").toLowerCase();
              const urlText = (item.url || "").toLowerCase();
              
              const matchedKw = [];
              for (const kw of CONFIG.hnKeywords) {
                const kwLower = kw.toLowerCase();
                if (titleText.includes(kwLower) || urlText.includes(kwLower)) {
                  matchedKw.push(kw);
                }
              }

              const commentCount = item.descendants || 0;
              if (matchedKw.length > 0 && commentCount > 1) {
                matches.push({
                  title: item.title,
                  url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
                  by: item.by || "unknown",
                  score: item.score || 0,
                  descendants: commentCount,
                  matchedKeywords: matchedKw
                });
              }
            } else {
              withinRange = false;
              break;
            }
          }
        }
      }
      index += batchSize;
    }
  } catch (e) {
    errors.push(`Error fetching Hacker News: ${e.message}`);
  }

  return matches;
}

/**
 * 5. Fetch Reddit r/QuantumComputing latest posts
 */
function fetchRedditPosts(errors) {
  const matches = [];
  const cutoffTime = Date.now() - (CONFIG.redditHours * 60 * 60 * 1000);

  try {
    const response = UrlFetchApp.fetch(CONFIG.redditFeedUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      throw new Error(`Reddit returned HTTP ${response.getResponseCode()}`);
    }
    const document = XmlService.parse(response.getContentText());
    const atomNs = XmlService.getNamespace("http://www.w3.org/2005/Atom");
    const entries = document.getRootElement().getChildren("entry", atomNs);

    for (const entry of entries) {
      const updatedStr = entry.getChildText("updated", atomNs);
      if (updatedStr) {
        const updatedDate = new Date(updatedStr);
        if (!isNaN(updatedDate.getTime()) && updatedDate.getTime() >= cutoffTime) {
          const title = entry.getChildText("title", atomNs) || "No Title";
          const linkElem = entry.getChild("link", atomNs);
          const link = linkElem ? linkElem.getAttribute("href").getValue() : "";

          matches.push({
            title: title.trim(),
            link: link.trim()
          });
        }
      }
    }
  } catch (e) {
    errors.push(`Error fetching Reddit feed: ${e.message}`);
  }

  return matches;
}

/**
 * Gemini API caller
 */
function callGemini(promptText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.geminiModel}:generateContent?key=${CONFIG.geminiApiKey}`;

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
    throw new Error(`Gemini API returned code ${responseCode}: ${responseText}`);
  }

  const json = JSON.parse(responseText);
  return json.candidates[0].content.parts[0].text;
}

