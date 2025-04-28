const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Configuration - Replace with your actual API key
const OPENROUTER_API_KEY = "<API_KEY>";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/**
 * System prompt for rewriting transcripts to markdown
 */
const SYSTEM_PROMPT = `
You are an expert editor specializing in converting raw transcripts into well-formatted markdown documents.
 Clean and reformat the provided transcript for optimal readability while preserving all substantive content, maintaining the speaker's authentic voice, and retaining important context. Follow these guidelines:

1. **Preserve all substantive content** - Do not summarise or omit meaningful information, examples, anecdotes, or insights from the original transcript. Every significant point should be retained.
2. **Maintain all technical information** - Carefully preserve all technical instructions, step-by-step processes, tool recommendations, and specialized terminology. Ensure that anyone following the reformatted transcript can execute the same technical procedures described in the original.
3. **Retain all activities and exercises** - Keep all interactive elements, exercises, and activities intact with their complete instructions. Preserve the original sequence and purpose of each activity while formatting them clearly for easy implementation.
4. **Improve sentence structure and flow** - Convert fragmented speech, false starts, and run-on sentences into clear, complete sentences. Maintain a natural conversational tone while removing excessive verbal fillers (um, uh, like, you know).
5. **Retain the speaker's voice and personality** - Preserve distinctive expressions, metaphors, colloquialisms, and speaking style that reflect the speaker's personality and make the content engaging.
6. **Organise content logically** - Add meaningful section headings where appropriate to create a logical structure. Group related thoughts together for improved comprehension. Use UK English.
7. **Format for readability** - Use paragraphs, bullet points, and other formatting techniques to improve visual scanning and comprehension.
8. **Highlight key quotes** - Identify and highlight particularly insightful, memorable, or powerful statements from the speaker. Format these as standalone blockquotes or use formatting (like bold or italics) to make them stand out. For example: "At some point, you can't blame a clown for being a clown, but you have to ask yourself why you keep going back to the circus."
9. **Remove live talk elements** - While maintaining substantive content, you may streamline elements that solely relate to the live nature of the talk (e.g., "I see people are still joining," "Let's wait a few more minutes"). However, preserve meaningful audience interactions that contribute to understanding the content.
10. **Maintain important context** - Preserve references to audience interactions, questions, and responses that provide important context to the content, particularly those that lead to explanations or clarifications.
11. **Handle multi-speaker transcripts carefully** - Clearly indicate speaker changes and preserve the interactive nature of discussions, panels, or Q&A sessions.
12. **Preserve proper names** - Ensure company names, product names, people references, and other proper nouns are correctly maintained.
13. **Clarify ambiguities** - When speech is unclear or contains ambiguous references, maintain the original wording but add minimal clarification if absolutely necessary.
14. **Handle technical content carefully** - Ensure specialised terminology, processes, or concepts are accurately preserved with clear explanations that maintain their original meaning and usage context.
15. **Preserve emotional context** - Maintain indications of emphasis, humour, seriousness, or other emotional contexts that are important to understanding the message.
16. **Include Q&A sessions in full** - Always include any Q&A sessions, audience questions, or interactive discussions that follow the main presentation. Format these clearly with appropriate headers (e.g., "## Q&A Session") and identify speakers for each question and response. Q&A content often contains valuable clarifications and additional insights not covered in the main talk.
17. **Use British English** – Use British English throughout and sentence case for headings. Use hyphens instead of colons in the title.
18. **Create a summary** - At the end of the document, include a short executive summary of the key themes and action points.
The goal is to make the transcript more readable and accessible while ensuring that anyone reading the cleaned version receives the same information, insights, and experience they would get from the original, just in a more digestible format. The highlighted key quotes should serve as "mental bookmarks" that capture the essence of the speaker's message and make the most impactful ideas immediately recognisable.

This reformatted transcript should serve as a comprehensive educational resource that someone could follow independently to achieve the same objectives as an attendee of the original talk. Respond with the transcribed text only.
`;

/**
 * Processes a single transcript file using OpenRouter API
 * @param {string} filePath - Path to the transcript file
 * @returns {Promise<string>} - Processed markdown content
 */
async function processTranscript(filePath) {
  try {
    console.log(`Processing: ${filePath}`);
    const fileName = path.basename(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    
    const markdownContent = await rewriteWithOpenRouter(content);
    
    console.log(`✓ Successfully processed: ${fileName}`);
    return markdownContent;
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Uses OpenRouter API to rewrite content as markdown
 * @param {string} content - The transcript content to rewrite
 * @returns {Promise<string>} - Rewritten markdown content
 */
async function rewriteWithOpenRouter(content) {
  try {
    const response = await axios.post(
      OPENROUTER_ENDPOINT,
      {
        model: "deepseek/deepseek-chat-v3-0324:free",  // Or any model you prefer
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    // Extract the rewritten content from the API response
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling OpenRouter API:", error.response?.data || error.message);
    throw new Error("Failed to rewrite content with OpenRouter API");
  }
}

/**
 * Saves content to a markdown file
 * @param {string} content - Content to save
 * @param {string} outputPath - Path where to save the markdown file
 */
async function saveMarkdownFile(content, outputPath) {
  try {
    await fs.writeFile(outputPath, content, 'utf8');
    console.log(`✓ Saved markdown file: ${outputPath}`);
  } catch (error) {
    console.error(`Error saving file: ${error.message}`);
    throw error;
  }
}

/**
 * Main function to process transcript files
 * @param {string} inputPath - Path to transcript file or directory
 * @param {string} outputPath - Path where to save the output markdown file
 */
async function main() {
  // Get command line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: node script.js <input_path> <output_file>");
    process.exit(1);
  }
  
  const inputPath = args[0];
  const outputPath = args[1];
  
  try {
    const stats = await fs.stat(inputPath);
    
    if (stats.isFile()) {
      // Process single file
      console.log("Processing single transcript file...");
      const markdownContent = await processTranscript(inputPath);
      await saveMarkdownFile(markdownContent, outputPath);
      console.log("✅ Conversion completed successfully!");
    } 
    else if (stats.isDirectory()) {
      // Process multiple files in directory
      console.log("Processing directory of transcript files...");
      const files = await fs.readdir(inputPath);
      const textFiles = files.filter(file => 
        file.endsWith('.txt') || file.endsWith('.text') || file.endsWith('.transcript')
      );
      
      if (textFiles.length === 0) {
        console.error("No transcript files found in the directory.");
        process.exit(1);
      }
      
      console.log(`Found ${textFiles.length} transcript files to process.`);
      
      // Process each file
      const processedContents = [];
      for (const file of textFiles) {
        const filePath = path.join(inputPath, file);
        const markdownContent = await processTranscript(filePath);
        processedContents.push({
          fileName: file,
          content: markdownContent
        });
      }
      
      // Sort files naturally if they have numbers in their names
      processedContents.sort((a, b) => {
        // Extract numbers from file names if present
        const aMatch = a.fileName.match(/(\d+)/);
        const bMatch = b.fileName.match(/(\d+)/);
        
        if (aMatch && bMatch) {
          return parseInt(aMatch[0]) - parseInt(bMatch[0]);
        }
        return a.fileName.localeCompare(b.fileName);
      });
      
      // Combine all processed content
      const combinedContent = processedContents.map(item => {
        const title = item.fileName.replace(/\.(txt|text|transcript)$/, '');
        return `${item.content}\n\n---\n\n`;
      }).join('');
      
      // Save combined markdown
      await saveMarkdownFile(combinedContent, outputPath);
      console.log("✅ Conversion completed successfully!");
    } 
    else {
      console.error("The input path is neither a file nor a directory.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error during conversion process:", error.message);
    process.exit(1);
  }
}

// Run the script
main();
