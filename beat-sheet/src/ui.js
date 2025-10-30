/**
 * UI Generation for ALLY Beat Sheets Worker
 * 
 * Generates HTML pages for beat display and navigation
 */

/**
 * Generate individual beat page
 */
export function generateBeatPage(actNumber, beatNumber, beatData, actTitle) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ALLY - ${actTitle} - Beat ${beatNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #0d1117;
            color: #c9d1d9;
            line-height: 1.6;
            padding: 2rem;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
        }

        .back-link {
            color: #58a6ff;
            text-decoration: none;
            display: inline-block;
            margin-bottom: 2rem;
            font-size: 0.9rem;
        }

        .back-link:hover {
            text-decoration: underline;
        }

        .header {
            border-bottom: 2px solid #21262d;
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
        }

        h1 {
            font-size: 2rem;
            font-weight: 600;
            color: #58a6ff;
            margin-bottom: 0.5rem;
        }

        .metadata {
            color: #8b949e;
            font-size: 0.9rem;
            display: flex;
            gap: 2rem;
            flex-wrap: wrap;
        }

        .content-section {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 2rem;
            margin-bottom: 2rem;
        }

        .content-section h2 {
            font-size: 1.3rem;
            color: #58a6ff;
            margin-bottom: 1rem;
            border-bottom: 1px solid #21262d;
            padding-bottom: 0.5rem;
        }

        .content-section p {
            margin-bottom: 1rem;
            line-height: 1.7;
        }

        .beat-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .detail-card {
            background: #0d1117;
            border: 1px solid #21262d;
            border-radius: 6px;
            padding: 1rem;
        }

        .detail-card h3 {
            color: #f85149;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.5rem;
        }

        .detail-card p {
            color: #c9d1d9;
            font-size: 1rem;
            margin: 0;
        }

        .navigation {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 0;
            border-top: 1px solid #21262d;
            margin-top: 2rem;
        }

        .nav-button {
            color: #58a6ff;
            text-decoration: none;
            padding: 0.5rem 1rem;
            border: 1px solid #30363d;
            border-radius: 4px;
            transition: background 0.2s;
        }

        .nav-button:hover {
            background: #21262d;
        }

        .nav-button:disabled {
            color: #8b949e;
            border-color: #21262d;
            pointer-events: none;
        }

        @media (max-width: 768px) {
            body {
                padding: 1rem;
            }
            
            h1 {
                font-size: 1.5rem;
            }
            
            .beat-details {
                grid-template-columns: 1fr;
            }
            
            .navigation {
                flex-direction: column;
                gap: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="/ally/act/${actNumber}" class="back-link">← Back to ${actTitle}</a>
        
        <div class="header">
            <h1>Beat ${beatNumber} ${beatData.sceneNumber ? `(Scene ${beatData.sceneNumber})` : ''}</h1>
            <div class="metadata">
                <span>Last updated: ${beatData.lastUpdated}</span>
                <span>Created: ${beatData.createdDate}</span>
            </div>
        </div>

        <div class="content-section">
            <h2>${beatData.title}</h2>
            <p>${beatData.description}</p>
        </div>

        <div class="beat-details">
            <div class="detail-card">
                <h3>Conflict</h3>
                <p>${beatData.conflict}</p>
            </div>
            
            <div class="detail-card">
                <h3>Emotion</h3>
                <p>${beatData.emotion}</p>
            </div>
            
            <div class="detail-card">
                <h3>Location</h3>
                <p>${beatData.location}</p>
            </div>
            
            <div class="detail-card">
                <h3>Time of Day</h3>
                <p>${beatData.timeOfDay}</p>
            </div>
            
            <div class="detail-card">
                <h3>Characters</h3>
                <p>${beatData.characters}</p>
            </div>
        </div>

        <div class="navigation">
            <a href="/ally/act/${actNumber}/beat/${beatNumber - 1}" class="nav-button" ${beatNumber <= 1 ? 'style="visibility: hidden;"' : ''}>
                ← Previous Beat
            </a>
            
            <a href="/ally/act/${actNumber}" class="nav-button">
                ${actTitle} Overview
            </a>
            
            <a href="/ally/act/${actNumber}/beat/${beatNumber + 1}" class="nav-button">
                Next Beat →
            </a>
        </div>
    </div>
</body>
</html>`;

  return html;
}

/**
 * Generate MobiCycle Productions homepage with project links
 */
export function generateHomepage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MobiCycle Productions - Beat Sheets</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #0a0a0a;
            min-height: 100vh;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }

        .container {
            text-align: center;
            max-width: 800px;
        }

        .logo {
            font-size: 3rem;
            font-weight: 300;
            margin-bottom: 1rem;
            font-family: Georgia, 'Times New Roman', serif;
            letter-spacing: 2px;
        }

        .tagline {
            font-size: 1.2rem;
            color: #888;
            margin-bottom: 3rem;
        }

        .projects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-bottom: 3rem;
        }

        .project-card {
            background: #111;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 2rem;
            transition: border-color 0.2s, transform 0.2s;
            text-decoration: none;
            color: inherit;
        }

        .project-card:hover {
            border-color: #555;
            transform: translateY(-2px);
        }

        .project-card h3 {
            font-size: 1.3rem;
            margin-bottom: 1rem;
            color: #fff;
        }

        .project-card p {
            color: #ccc;
            line-height: 1.6;
            font-size: 0.9rem;
        }

        .main-project {
            grid-column: 1 / -1;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;
        }

        .main-project h3 {
            color: white;
            font-size: 1.8rem;
        }

        .main-project p {
            color: rgba(255, 255, 255, 0.9);
            font-size: 1rem;
        }

        .footer {
            font-size: 0.9rem;
            color: #666;
            margin-top: 2rem;
        }

        @media (max-width: 768px) {
            .logo {
                font-size: 2rem;
            }
            
            .projects-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="logo">MobiCycle Productions</h1>
        <p class="tagline">Premium Content Development & Production Services</p>
        
        <div class="projects-grid">
            <a href="/ally" class="project-card main-project">
                <h3>ALLY Beat Sheets</h3>
                <p>Comprehensive beat sheet management for the ALLY screenplay project. Track story beats, scene structure, and narrative flow with professional precision.</p>
            </a>
            
            <a href="https://acts.mobicycle.productions/" class="project-card">
                <h3>Acts</h3>
                <p>Manage and view act structure for the ALLY project with detailed content organization.</p>
            </a>
            
            <a href="https://sequences.mobicycle.productions/" class="project-card">
                <h3>Sequences</h3>
                <p>Sequence-level content management and display for comprehensive story development.</p>
            </a>
            
            <a href="https://scenes.mobicycle.productions/" class="project-card">
                <h3>Scenes</h3>
                <p>Granular scene management with detailed breakdowns and analysis tools.</p>
            </a>
        </div>
        
        <div class="footer">
            <p>&copy; 2024 MobiCycle Productions. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

  return html;
}