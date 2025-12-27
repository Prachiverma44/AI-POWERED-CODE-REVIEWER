import { GoogleGenAI, Type } from "@google/genai";
import { listFiles, readFile, writeFile } from "./tools.js";

export async function runAgent(directoryPath, apiKey, output) {
  const ai = new GoogleGenAI({ apiKey });

  output(`🔍 Reviewing: ${directoryPath}\n`);

  const history = [{
    role: "user",
    parts: [{ text: `Review and fix all code in: ${directoryPath}` }]
  }];

  const tools = {
    list_files: listFiles,
    read_file: readFile,
    write_file: writeFile
  };

  let steps = 0;
  const MAX_STEPS = 30;

  while (steps < MAX_STEPS) {
    steps++;

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: history,
      config: {
        systemInstruction: `
You are an expert JavaScript code reviewer and fixer.

**Your Job:**
1. Use list_files to get all HTML, CSS, JavaScript, and TypeScript files in the directory
2. Use read_file to read each file's content
3. Analyze for:
   
   **HTML Issues:**
   - Missing doctype, meta tags, semantic HTML
   - Broken links, missing alt attributes
   - Accessibility issues (ARIA, roles)
   - Inline styles that should be in CSS
   
   **CSS Issues:**
   - Syntax errors, invalid properties
   - Browser compatibility issues
   - Inefficient selectors
   - Missing vendor prefixes
   - Unused or duplicate styles
   
   **JavaScript Issues:**
   - BUGS: null/undefined errors, missing returns, type issues, async problems
   - SECURITY: hardcoded secrets, eval(), XSS risks, injection vulnerabilities
   - CODE QUALITY: console.logs, unused code, bad naming, complex logic

4. Use write_file to FIX the issues you found (write corrected code back)
5. After fixing all files, respond with a summary report in TEXT format

**Summary Report Format:**
📊 CODE REVIEW COMPLETE

Total Files Analyzed: X
Files Fixed: Y

🔴 SECURITY FIXES:
- file.js:line - Fixed hardcoded API key
- auth.js:line - Removed eval() usage

🟠 BUG FIXES:
- app.js:line - Added null check for user object
- index.html:line - Added missing alt attribute

🟡 CODE QUALITY IMPROVEMENTS:
- styles.css:line - Removed duplicate styles
- script.js:line - Removed console.log statements

Be practical and focus on real issues. Actually FIX the code, don't just report.
`,
        tools: [{
          functionDeclarations: [
            {
              name: "list_files",
              parameters: {
                type: Type.OBJECT,
                properties: { directory: { type: Type.STRING } },
                required: ["directory"]
              }
            },
            {
              name: "read_file",
              parameters: {
                type: Type.OBJECT,
                properties: { file_path: { type: Type.STRING } },
                required: ["file_path"]
              }
            },
            {
              name: "write_file",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  file_path: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ["file_path", "content"]
              }
            }
          ]
        }]
      }
    });

    if (result.functionCalls?.length) {
      for (const call of result.functionCalls) {
        output(`📌 ${call.name}`);
        const response = await tools[call.name](call.args);

        history.push({ role: "model", parts: [{ functionCall: call }] });
        history.push({
          role: "user",
          parts: [{
            functionResponse: {
              name: call.name,
              response: { result: response }
            }
          }]
        });
      }
    } else {
      output("\n" + (result.text || "Done."));
      break;
    }
  }
}
