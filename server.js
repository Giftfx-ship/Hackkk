// ============================================
// DEV-X PRO - Web & Tools Generator
// Developer: @Mrddev | Telegram: @devxtechzone
// ============================================

const express = require('express');
const archiver = require('archiver');
const axios = require('axios');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// File upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const sessions = new Map();

// AI API
const AI_API_URL = process.env.AI_API_URL;
const AI_API_KEY = process.env.AI_API_KEY;

async function callAI(prompt) {
    try {
        const response = await axios.post(AI_API_URL, {
            model: "llama-3.3-70b",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 4000
        }, {
            headers: { 
                'Authorization': `Bearer ${AI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('AI Error:', error.message);
        return null;
    }
}

async function generateProject(description, toolType) {
    const prompt = `Create a professional ${toolType} based on: "${description}"

Generate complete HTML/CSS/JS code. Modern, responsive, clean design.
Return ONLY valid HTML starting with <!DOCTYPE html>`;

    const aiCode = await callAI(prompt);
    
    if (aiCode && aiCode.includes('<!DOCTYPE html>')) {
        return {
            title: `${toolType}`,
            files: { "index.html": aiCode },
            instructions: "Open index.html in browser"
        };
    }
    
    return {
        title: toolType,
        files: {
            "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${toolType} | Dev-X</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #0a0a0f;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            color: #e4e4e7;
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        header { border-bottom: 1px solid #27272a; padding-bottom: 1rem; margin-bottom: 2rem; }
        h1 { font-size: 2rem; font-weight: 600; }
        .btn {
            background: #3b82f6;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            color: white;
            cursor: pointer;
            display: inline-block;
            margin-top: 1rem;
        }
        footer {
            border-top: 1px solid #27272a;
            margin-top: 3rem;
            padding-top: 1rem;
            text-align: center;
            font-size: 0.875rem;
            color: #71717a;
        }
        a { color: #3b82f6; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <header><h1>${toolType}</h1></header>
        <main>
            <p>${description}</p>
            <button class="btn" onclick="alert('Ready')">Launch</button>
        </main>
        <footer>
            <p>Dev-X Pro | <a href="https://t.me/devxtechzone">@devxtechzone</a></p>
        </footer>
    </div>
</body>
</html>`
        },
        instructions: "Open index.html in browser"
    };
}

// API Routes
app.get('/api/tools', (req, res) => {
    res.json(["Website", "Landing Page", "Portfolio", "Admin Dashboard", "REST API", "Telegram Bot", "Discord Bot", "Chrome Extension", "React App", "Node.js API"]);
});

app.post('/api/upload/:sessionId', upload.array('files', 20), async (req, res) => {
    const { sessionId } = req.params;
    const uploadedFiles = req.files.map(f => ({ originalname: f.originalname, filename: f.filename, path: f.path }));
    let session = sessions.get(sessionId) || {};
    session.uploadedFiles = [...(session.uploadedFiles || []), ...uploadedFiles];
    sessions.set(sessionId, session);
    res.json({ success: true, files: uploadedFiles });
});

app.post('/api/generate', async (req, res) => {
    const { toolType, description, sessionId } = req.body;
    const finalSessionId = sessionId || uuidv4();
    
    if (!toolType || !description) {
        return res.status(400).json({ error: "Tool type and description required" });
    }
    
    try {
        const generated = await generateProject(description, toolType);
        let session = sessions.get(finalSessionId) || {};
        session.toolType = toolType;
        session.generatedCode = generated;
        sessions.set(finalSessionId, session);
        res.json({ success: true, sessionId: finalSessionId, project: generated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/download/:sessionId', async (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session || !session.generatedCode) {
        return res.status(404).json({ error: "Project not found" });
    }
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=devx-${session.toolType?.replace(/ /g, '-') || 'project'}.zip`);
    archive.pipe(res);
    
    const files = session.generatedCode.files || {};
    for (const [filename, content] of Object.entries(files)) {
        archive.append(content, { name: filename });
    }
    
    if (session.uploadedFiles) {
        for (const file of session.uploadedFiles) {
            const filePath = path.join(__dirname, 'uploads', file.filename);
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: `assets/${file.originalname}` });
            }
        }
    }
    
    await archive.finalize();
});

// Frontend with Loading Animation
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dev-X Pro | Developer Suite</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            background: #09090b;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #e4e4e7;
            overflow-x: hidden;
        }
        
        /* ============ LOADING SCREEN ============ */
        .loading-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #09090b;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            transition: opacity 0.8s ease, visibility 0.8s ease;
        }
        
        .loading-screen.hide {
            opacity: 0;
            visibility: hidden;
        }
        
        .loader-container {
            text-align: center;
        }
        
        .loader-logo {
            font-size: 3rem;
            font-weight: 700;
            margin-bottom: 2rem;
            letter-spacing: -0.02em;
        }
        
        .loader-logo span {
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .loader-bar {
            width: 280px;
            height: 2px;
            background: #27272a;
            border-radius: 2px;
            overflow: hidden;
            margin: 1rem auto;
        }
        
        .loader-bar-fill {
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            animation: loadBar 2.5s ease forwards;
        }
        
        @keyframes loadBar {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
        }
        
        .loader-text {
            font-size: 0.875rem;
            color: #71717a;
            margin-top: 1rem;
            font-family: monospace;
        }
        
        .loader-dots::after {
            content: '';
            animation: dots 1.5s steps(4, end) infinite;
        }
        
        @keyframes dots {
            0%, 20% { content: ''; }
            40% { content: '.'; }
            60% { content: '..'; }
            80%, 100% { content: '...'; }
        }
        
        /* ============ MAIN CONTENT ============ */
        .app {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            opacity: 0;
            transition: opacity 0.5s ease;
        }
        
        .app.show {
            opacity: 1;
        }
        
        .container { max-width: 1280px; margin: 0 auto; padding: 0 1.5rem; width: 100%; }
        
        /* Header */
        .header {
            border-bottom: 1px solid #27272a;
            padding: 1rem 0;
            background: #09090b/80;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo h1 {
            font-size: 1.25rem;
            font-weight: 600;
        }
        
        .logo span { color: #3b82f6; }
        .logo p { font-size: 0.75rem; color: #71717a; }
        
        .social-links { display: flex; gap: 1rem; }
        .social-links a {
            color: #71717a;
            text-decoration: none;
            font-size: 0.875rem;
            transition: color 0.2s;
        }
        .social-links a:hover { color: #3b82f6; }
        
        /* Main */
        .main { flex: 1; padding: 2rem 0; }
        
        /* Tools */
        .section-title {
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #71717a;
            margin-bottom: 1rem;
        }
        
        .tools-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 0.5rem;
            margin-bottom: 2rem;
        }
        
        .tool-btn {
            background: #18181b;
            border: 1px solid #27272a;
            border-radius: 0.5rem;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            font-weight: 500;
            color: #e4e4e7;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
        }
        
        .tool-btn:hover {
            background: #27272a;
            border-color: #3b82f6;
        }
        
        .tool-btn.active {
            background: #3b82f6;
            border-color: #3b82f6;
            color: white;
        }
        
        /* Cards */
        .card {
            background: #18181b;
            border: 1px solid #27272a;
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        
        .card-title {
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #71717a;
        }
        
        /* Upload */
        .upload-area {
            border: 1px dashed #3b3b40;
            border-radius: 0.5rem;
            padding: 1.5rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .upload-area:hover {
            border-color: #3b82f6;
            background: rgba(59,130,246,0.05);
        }
        
        .file-list {
            margin-top: 0.75rem;
            font-size: 0.75rem;
            color: #71717a;
        }
        
        /* Form */
        textarea {
            width: 100%;
            background: #09090b;
            border: 1px solid #27272a;
            border-radius: 0.5rem;
            padding: 0.75rem;
            color: #e4e4e7;
            font-size: 0.875rem;
            font-family: inherit;
            resize: vertical;
            margin-bottom: 1rem;
        }
        
        textarea:focus {
            outline: none;
            border-color: #3b82f6;
        }
        
        /* Buttons */
        .btn {
            border: none;
            border-radius: 0.5rem;
            padding: 0.625rem 1.25rem;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .btn-primary:hover { background: #2563eb; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .btn-secondary {
            background: #27272a;
            color: #e4e4e7;
        }
        
        .btn-secondary:hover { background: #3b3b40; }
        
        .btn-group { display: flex; gap: 0.75rem; margin-top: 1rem; }
        
        /* Result */
        .result-card { display: none; }
        .result-card.show { display: block; animation: fadeIn 0.3s ease; }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .code-preview {
            background: #09090b;
            border: 1px solid #27272a;
            border-radius: 0.5rem;
            padding: 1rem;
            font-family: monospace;
            font-size: 0.75rem;
            overflow-x: auto;
            margin: 1rem 0;
            max-height: 200px;
        }
        
        /* Generation Overlay */
        .gen-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(9,9,11,0.95);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            flex-direction: column;
        }
        
        .gen-overlay.show { display: flex; }
        
        .gen-spinner {
            width: 40px;
            height: 40px;
            border: 2px solid #27272a;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 1rem;
        }
        
        .gen-text {
            font-family: monospace;
            font-size: 0.875rem;
            color: #71717a;
        }
        
        @keyframes spin { to { transform: rotate(360deg); } }
        
        /* Footer */
        .footer {
            border-top: 1px solid #27272a;
            padding: 1.5rem 0;
            text-align: center;
            font-size: 0.75rem;
            color: #71717a;
        }
        
        @media (max-width: 768px) {
            .container { padding: 0 1rem; }
            .tools-grid { grid-template-columns: repeat(2, 1fr); }
        }
    </style>
</head>
<body>
    <!-- LOADING SCREEN -->
    <div class="loading-screen" id="loadingScreen">
        <div class="loader-container">
            <div class="loader-logo">DEV-X <span>PRO</span></div>
            <div class="loader-bar">
                <div class="loader-bar-fill"></div>
            </div>
            <div class="loader-text">Initializing<span class="loader-dots"></span></div>
        </div>
    </div>
    
    <!-- GENERATION OVERLAY -->
    <div class="gen-overlay" id="genOverlay">
        <div class="gen-spinner"></div>
        <div class="gen-text" id="genText">Generating your project...</div>
    </div>
    
    <!-- MAIN APP -->
    <div class="app" id="app">
        <header class="header">
            <div class="container">
                <div class="header-content">
                    <div class="logo">
                        <h1>DEV-X <span>PRO</span></h1>
                        <p>developer suite</p>
                    </div>
                    <div class="social-links">
                        <a href="https://t.me/devxtechzone" target="_blank">Telegram</a>
                        <a href="https://whatsapp.com/channel/0029VbC55M1EKyZCBwpsd035" target="_blank">WhatsApp</a>
                    </div>
                </div>
            </div>
        </header>
        
        <main class="main">
            <div class="container">
                <div class="section-title">Development Tools</div>
                <div class="tools-grid" id="toolsGrid"></div>
                
                <div class="card">
                    <div class="card-title">Assets</div>
                    <div class="upload-area" id="uploadArea">
                        <div>📁 Drop files or click to upload</div>
                        <div class="file-list" id="fileList"></div>
                        <input type="file" id="fileInput" multiple style="display:none">
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-title">Project Description</div>
                    <textarea id="description" rows="4" placeholder="Describe what you want to build...&#10;&#10;Example: A modern portfolio website for a photographer with gallery and contact form"></textarea>
                    <button class="btn btn-primary" id="generateBtn">Generate Project</button>
                </div>
                
                <div class="result-card" id="resultCard">
                    <div class="card">
                        <div class="card-title" id="resultTitle"></div>
                        <div id="resultContent"></div>
                        <div class="btn-group">
                            <button class="btn btn-primary" id="downloadBtn">Download ZIP</button>
                            <button class="btn btn-secondary" id="resetBtn">New Project</button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
        
        <footer class="footer">
            <div class="container">
                <p>Dev-X Pro | @Mrddev</p>
            </div>
        </footer>
    </div>
    
    <script>
        // Hide loading screen after animation
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            loadingScreen.classList.add('hide');
            document.getElementById('app').classList.add('show');
        }, 2800);
        
        let currentSessionId = null;
        let selectedTool = "Website";
        let uploadedFiles = [];
        
        const tools = ["Website", "Landing Page", "Portfolio", "Admin Dashboard", "REST API", "Telegram Bot", "Discord Bot", "Chrome Extension", "React App", "Node.js API"];
        
        const toolsGrid = document.getElementById('toolsGrid');
        tools.forEach(tool => {
            const btn = document.createElement('button');
            btn.className = 'tool-btn' + (tool === selectedTool ? ' active' : '');
            btn.textContent = tool;
            btn.onclick = () => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedTool = tool;
            };
            toolsGrid.appendChild(btn);
        });
        
        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        uploadArea.onclick = () => fileInput.click();
        uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.style.borderColor = '#3b82f6'; };
        uploadArea.ondragleave = () => uploadArea.style.borderColor = '#3b3b40';
        uploadArea.ondrop = async (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#3b3b40';
            await uploadFiles(Array.from(e.dataTransfer.files));
        };
        
        fileInput.onchange = async (e) => await uploadFiles(Array.from(e.target.files));
        
        async function uploadFiles(files) {
            if (!currentSessionId) currentSessionId = 'session_' + Date.now();
            
            const formData = new FormData();
            files.forEach(f => formData.append('files', f));
            
            const response = await fetch(\`/api/upload/\${currentSessionId}\`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            uploadedFiles.push(...data.files);
            
            const fileListDiv = document.getElementById('fileList');
            fileListDiv.innerHTML = uploadedFiles.map(f => \`📄 \${f.originalname}\`).join('<br>');
        }
        
        async function generate() {
            const description = document.getElementById('description').value.trim();
            if (!description) {
                alert('Please describe your project');
                return;
            }
            
            const btn = document.getElementById('generateBtn');
            const overlay = document.getElementById('genOverlay');
            const genText = document.getElementById('genText');
            
            btn.disabled = true;
            btn.textContent = 'Generating...';
            overlay.classList.add('show');
            
            const messages = ['Analyzing requirements...', 'Building structure...', 'Writing code...', 'Finalizing...'];
            let msgIndex = 0;
            const msgInterval = setInterval(() => {
                if (msgIndex < messages.length) {
                    genText.textContent = messages[msgIndex];
                    msgIndex++;
                }
            }, 800);
            
            try {
                const response = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        toolType: selectedTool,
                        description: description,
                        sessionId: currentSessionId
                    })
                });
                
                const data = await response.json();
                clearInterval(msgInterval);
                
                if (data.success) {
                    currentSessionId = data.sessionId;
                    const files = data.project.files || {};
                    
                    document.getElementById('resultTitle').textContent = \`\${selectedTool} - Ready\`;
                    document.getElementById('resultContent').innerHTML = \`
                        <div class="code-preview">
                            <strong>Files:</strong> \${Object.keys(files).join(', ')}
                        </div>
                        <p style="font-size:0.875rem; color:#71717a;">\${data.project.instructions || 'Download the ZIP file to get started.'}</p>
                    \`;
                    document.getElementById('resultCard').classList.add('show');
                    window.scrollTo({ top: document.getElementById('resultCard').offsetTop - 100, behavior: 'smooth' });
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (error) {
                clearInterval(msgInterval);
                alert('Error: ' + error.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Generate Project';
                overlay.classList.remove('show');
            }
        }
        
        function downloadProject() {
            if (currentSessionId) {
                window.location.href = \`/api/download/\${currentSessionId}\`;
            }
        }
        
        function resetForm() {
            document.getElementById('description').value = '';
            document.getElementById('resultCard').classList.remove('show');
            uploadedFiles = [];
            document.getElementById('fileList').innerHTML = '';
            currentSessionId = null;
        }
        
        document.getElementById('generateBtn').onclick = generate;
        document.getElementById('downloadBtn').onclick = downloadProject;
        document.getElementById('resetBtn').onclick = resetForm;
    </script>
</body>
</html>
    `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Dev-X Pro running at http://localhost:${PORT}`);
    console.log(`👨‍💻 Developer: @Mrddev`);
    console.log(`📱 Telegram: @devxtechzone\n`);
});
