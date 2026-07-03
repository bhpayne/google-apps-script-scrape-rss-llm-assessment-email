

# What

1. Fetch and aggregate various RSS feeds.
2. Send the aggregated text to the Google Gemini API (the same LLM engine powering NotebookLM) to analyze and assess the trends.
3. Automatically email the resulting assessment to your inbox using Google's built-in MailApp service.

# How

Google Sheets features a built-in `=IMPORTFEED` function, but Google Docs does not have an out-of-the-box feature to import RSS feeds. However, writing a custom Google Apps Script bound to your Google Doc can achieve this functionality.

The script relies on three main built-in Apps Script services:
- `UrlFetchApp`: To retrieve the raw XML content of the RSS feed from the web.
- `XmlService`: To parse the XML structure and extract details like article titles, publication dates, and links.
- `DocumentApp`: To programmatically write, format, and insert that extracted content directly into your Google Doc.

set this up:
1. Open a Google Doc.
1. In the top menu, go to Extensions > Apps Script.
1. Delete any default code in the editor and paste the content of the .gs script
1. Save the project by clicking the Save icon (the floppy disk) at the top of the editor.
1. If you want the document to update automatically without manually clicking the menu, you can configure a "Time-driven trigger" in the Apps Script dashboard (the clock icon on the left panel) to run the `importRssFeed` function on a recurring schedule (such as daily or hourly).

The script relies on a Google API key from Google AI Studio and generate a free API key from <https://aistudio.google.com/api-keys>.


# resources

<https://developers.google.com/apps-script/guides/docs>
