/**
 * BEAT-SHEETS - ALLY Beat Sheets UI Worker
 * 
 * Pure UI worker for displaying ALLY screenplay beats (1 scene = 1 beat).
 * Reads data from D1 database and presents beautiful HTML reports.
 * 
 * ARCHITECTURE:
 * - D1 Database (SCREENPLAY_DRAFT): Reads beat data for display
 * - No KV operations: Sync handled by dedicated sync worker
 * - No sync logic: Pure UI presentation layer
 * 
 * KEY FEATURES:
 * 1. Interactive HTML UI for browsing beats by act
 * 2. Individual beat pages with navigation
 * 3. Export capabilities (HTML, JSON, CSV, PDF)
 * 4. Authentication via Cloudflare Access JWT
 * 5. Graceful empty state handling
 * 
 * MAIN ROUTES:
 * - / : MobiCycle Productions homepage
 * - /ally : Acts overview page
 * - /ally/act/{actNo} : Act-specific beats
 * - /ally/act/{actNo}/beat/{beatNo} : Individual beat pages
 * - /api/reports/* : Report generation endpoints
 * 
 * DATA FLOW:
 * 1. Sync worker maintains D1 data from KV
 * 2. This worker queries D1 for fast display
 * 3. Users see beautiful HTML reports
 */

import { generateBeatPage, generateHomepage } from './ui.js';
import { jsonResponse } from './utils.js';

/**
 * Main Worker handler
 */
export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      return jsonResponse({
        error: 'Internal server error',
        message: error.message
      }, 500);
    }
  }
};

/**
 * Handle incoming requests
 */
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authentication check
  if (!isAuthenticated(request, env)) {
    return jsonResponse({
      error: 'Unauthorized',
      message: 'Valid API key required'
    }, 401, corsHeaders);
  }

  // Route handling
  if (path === '/' || path === '') {
    // Show MobiCycle Productions homepage with project links
    const htmlResponse = generateHomepage();
    return new Response(htmlResponse, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        ...corsHeaders
      }
    });
  }

  // Acts overview page
  if (path === '/ally') {
    return generateActsOverview(corsHeaders);
  }

  // All beats report
  if (path === '/act/all') {
    return await handleReportRequest(env, 'html', corsHeaders);
  }

  // All beats across entire script
  if (path === '/ally/beats/all') {
    return await generateAllBeatsPage(env, corsHeaders);
  }

  // Act-specific beats page
  if (path.match(/^\/ally\/act\/\d+$/)) {
    const actNumber = parseInt(path.split('/')[3]);
    return await generateActBeatsPage(actNumber, env, corsHeaders);
  }

  // Individual beat pages
  if (path.match(/^\/ally\/act\/\d+\/beat\/\d+$/)) {
    const pathParts = path.split('/');
    const actNumber = parseInt(pathParts[3]);
    const beatNumber = parseInt(pathParts[5]);
    
    // Get beat data from database
    try {
      const db = env.SCREENPLAY_DRAFT;
      const beat = await db.prepare(`
        SELECT 
          b.id,
          b.beat_number,
          b.scene_number,
          b.title,
          b.description,
          b.conflict,
          b.emotion,
          b.location,
          b.time_of_day,
          b.characters,
          b.version,
          b.created_at,
          b.updated_at,
          a.act_no,
          a.title as act_title
        FROM beats b
        JOIN acts a ON b.act_id = a.id
        WHERE a.act_no = ? AND b.beat_number = ? AND b.is_current = 1
      `).bind(actNumber, beatNumber).first();
      
      let beatData, actTitle;
      
      if (!beat) {
        // Try to get act title even if beat doesn't exist
        const act = await db.prepare(`
          SELECT title FROM acts WHERE act_no = ?
        `).bind(actNumber).first();
        
        actTitle = act ? act.title : `Act ${actNumber}`;
        beatData = {
          title: `Beat ${beatNumber}`,
          description: `Beat ${beatNumber} was not found in ${actTitle}. This beat may not exist yet or may have been removed.`,
          conflict: 'N/A',
          emotion: 'N/A',
          location: 'N/A',
          timeOfDay: 'N/A',
          characters: 'N/A',
          sceneNumber: beatNumber,
          lastUpdated: 'N/A',
          createdDate: 'Not available'
        };
      } else {
        beatData = {
          title: beat.title || `Beat ${beatNumber}`,
          description: beat.description || 'No description available.',
          conflict: beat.conflict || 'No conflict defined',
          emotion: beat.emotion || 'No emotion specified',
          location: beat.location || 'Location not specified',
          timeOfDay: beat.time_of_day || 'Time not specified',
          characters: beat.characters || 'Characters not specified',
          sceneNumber: beat.scene_number || beatNumber,
          lastUpdated: beat.updated_at ? new Date(beat.updated_at).toLocaleDateString() : 'Unknown',
          createdDate: beat.created_at ? new Date(beat.created_at).toLocaleDateString() : 'Creation date unknown'
        };
        actTitle = beat.act_title || `Act ${actNumber}`;
      }
      
      const htmlResponse = generateBeatPage(actNumber, beatNumber, beatData, actTitle);
      return new Response(htmlResponse, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          ...corsHeaders
        }
      });
      
    } catch (error) {
      console.error('Database error:', error);
      
      // Show HTML error page instead of JSON
      const actTitle = `Act ${actNumber}`;
      const beatData = {
        title: `Beat ${beatNumber}`,
        description: `Unable to load beat data due to a database error: ${error.message}. Please try again later.`,
        conflict: 'Error',
        emotion: 'Error',
        location: 'Error',
        timeOfDay: 'Error',
        characters: 'Error',
        sceneNumber: beatNumber,
        lastUpdated: 'Error',
        createdDate: 'Error'
      };
      
      const htmlResponse = generateBeatPage(actNumber, beatNumber, beatData, actTitle);
      return new Response(htmlResponse, {
        status: 500,
        headers: {
          'Content-Type': 'text/html',
          ...corsHeaders
        }
      });
    }
  }

  // Beats report dashboard
  if (path === '/dashboard' || path === '/report') {
    return await handleReportRequest(env, 'html', corsHeaders);
  }

  // API documentation endpoint
  if (path === '/api' || path === '/api/') {
    return jsonResponse({
      name: 'BEAT-SHEETS UI Worker',
      version: '1.0.0',
      description: 'Pure UI worker for ALLY Beat Sheets display and reporting',
      endpoints: {
        ui: {
          home: 'GET / - MobiCycle Productions homepage',
          ally: 'GET /ally - Acts overview page',
          beats: 'GET /ally/beats/all - All beats across script',
          act: 'GET /ally/act/{actNo} - Act-specific beats',
          beat: 'GET /ally/act/{actNo}/beat/{beatNo} - Individual beat page'
        },
        reports: {
          html: 'GET /api/reports/beats/html - HTML beats report',
          json: 'GET /api/reports/beats - JSON beats report',
          csv: 'GET /api/reports/beats/csv - CSV download',
          pdf: 'GET /api/reports/beats/pdf - PDF download'
        },
        info: {
          api: 'GET /api - API documentation',
          health: 'GET /health - Health check'
        }
      },
      features: [
        'Beautiful HTML report UI with dark theme',
        'Beat management with scene breakdown (1 scene = 1 beat)',
        'Graceful empty state handling',
        'Export capabilities (HTML, JSON, CSV, PDF)',
        'Authentication via Cloudflare Access',
        'Responsive design for all screen sizes'
      ],
      note: 'This is a pure UI worker. Data sync is handled by the dedicated sync worker at kv-d1-sync.mobicycle-productions.workers.dev'
    }, 200, corsHeaders);
  }

  if (path === '/health') {
    return jsonResponse({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'beat-sheets-ui',
      bindings: {
        d1: !!env.SCREENPLAY_DRAFT
      }
    }, 200, corsHeaders);
  }

  // Report routes
  if (path.startsWith('/api/reports/')) {
    return await handleReportRouting(request, env, path, method, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

/**
 * Generate beats report grouped by act
 */
async function generateBeatReport(env, format = 'json') {
  try {
    const db = env.SCREENPLAY_DRAFT;

    // Get all current beats from D1 with act information
    const beats = await db.prepare(`
      SELECT
        b.id,
        b.act_id,
        b.beat_number,
        b.scene_number,
        b.title,
        b.description,
        b.conflict,
        b.emotion,
        b.location,
        b.time_of_day,
        b.characters,
        b.version,
        b.created_at,
        b.updated_at,
        a.act_no,
        a.title as act_title
      FROM beats b
      JOIN acts a ON b.act_id = a.id
      WHERE b.is_current = 1
      ORDER BY a.act_no, b.beat_number
    `).all();

    // Group beats by act
    const reportData = {};
    let totalBeats = 0;

    for (const beat of beats.results) {
      const actKey = `Act ${beat.act_no}`;

      if (!reportData[actKey]) {
        reportData[actKey] = {
          act_no: beat.act_no,
          act_id: beat.act_id,
          act_title: beat.act_title,
          beats: [],
          beat_count: 0
        };
      }

      reportData[actKey].beats.push({
        beat_number: beat.beat_number,
        scene_number: beat.scene_number,
        title: beat.title,
        description: beat.description,
        conflict: beat.conflict,
        emotion: beat.emotion,
        location: beat.location,
        time_of_day: beat.time_of_day,
        characters: beat.characters,
        version: beat.version,
        created_at: beat.created_at,
        updated_at: beat.updated_at
      });

      reportData[actKey].beat_count++;
      totalBeats++;
    }

    // Convert to array and add summary
    const acts = Object.values(reportData);

    const report = {
      report_type: 'beats_by_act',
      generated_at: new Date().toISOString(),
      summary: {
        total_acts: acts.length,
        total_beats: totalBeats,
        beats_per_act: acts.map(act => ({
          act_no: act.act_no,
          act_title: act.act_title,
          beat_count: act.beat_count
        }))
      },
      acts: acts
    };

    if (format === 'csv') {
      return generateCSVReport(report);
    } else if (format === 'html') {
      return generateHTMLReport(report);
    } else if (format === 'pdf') {
      return generatePDFOptimizedHTML(report);
    }

    return report;

  } catch (error) {
    throw new Error(`Failed to generate report: ${error.message}`);
  }
}

/**
 * Generate HTML format report
 */
function generateHTMLReport(report) {
  // Generate sidebar navigation
  const sidebarHTML = `
    <nav class="sidebar">
      <h3>Quick Navigation</h3>
      <ul class="nav-list">
        <li class="nav-item"><a href="#overview" class="nav-link">Overview</a></li>
        ${report.acts.map(act => `
          <li class="nav-item">
            <a href="#act-${act.act_no}" class="nav-link">Act ${act.act_no}</a>
          </li>
        `).join('')}
      </ul>
    </nav>
  `;

  // Generate beats content
  const beatsHTML = report.acts.map(act => `
    <div class="act-section" id="act-${act.act_no}">
      <div class="act-header">
        <div class="act-title">Act ${act.act_no}</div>
        <div class="act-number">Last updated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
      <div class="act-description">
        ${act.beats.map(beat => `
          <div class="beat-entry">
            <h2>Beat ${beat.beat_number} ${beat.scene_number ? `(Scene ${beat.scene_number})` : ''}</h2>
            <h3>${beat.title || 'Untitled Beat'}</h3>
            <p><strong>Description:</strong> ${beat.description || 'No description available.'}</p>
            ${beat.conflict ? `<p><strong>Conflict:</strong> ${beat.conflict}</p>` : ''}
            ${beat.emotion ? `<p><strong>Emotion:</strong> ${beat.emotion}</p>` : ''}
            ${beat.location ? `<p><strong>Location:</strong> ${beat.location}</p>` : ''}
            ${beat.time_of_day ? `<p><strong>Time:</strong> ${beat.time_of_day}</p>` : ''}
            ${beat.characters ? `<p><strong>Characters:</strong> ${beat.characters}</p>` : ''}
            <hr>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ally - Beat Sheets Report</title>
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
            transition: background-color 0.3s ease, color 0.3s ease;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            gap: 2rem;
        }
        
        .sidebar {
            width: 250px;
            flex-shrink: 0;
            position: sticky;
            top: 2rem;
            height: fit-content;
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 1.5rem;
        }
        
        .sidebar h3 {
            color: #58a6ff;
            font-size: 1rem;
            margin-bottom: 1rem;
            font-weight: 600;
        }
        
        .nav-list {
            list-style: none;
            margin: 0;
            padding: 0;
        }
        
        .nav-item {
            margin-bottom: 0.5rem;
        }
        
        .nav-link {
            color: #8b949e;
            text-decoration: none;
            font-size: 0.9rem;
            display: block;
            padding: 0.5rem;
            border-radius: 4px;
            transition: all 0.2s ease;
        }
        
        .nav-link:hover {
            background: #21262d;
            color: #c9d1d9;
        }
        
        .main-content {
            flex: 1;
            min-width: 0;
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
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        
        .header-content {
            flex: 1;
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
        }

        .act-section {
            background: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }

        .act-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #21262d;
        }

        .act-title {
            font-size: 1.3rem;
            font-weight: 600;
            color: #58a6ff;
        }

        .act-number {
            color: #f85149;
            font-size: 0.9rem;
        }

        .act-description {
            color: #c9d1d9;
            font-size: 1rem;
            line-height: 1.7;
            transition: color 0.3s ease;
        }

        .beat-entry {
            margin-bottom: 2rem;
            padding: 1rem;
            background: #0d1117;
            border-radius: 6px;
            border: 1px solid #21262d;
        }
        
        .beat-entry h2 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0 0 0.75rem 0;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #21262d;
            color: #c9d1d9;
        }

        .beat-entry h3 {
            font-size: 1.1rem;
            font-weight: 500;
            margin: 0 0 0.5rem 0;
            color: #58a6ff;
        }

        .beat-entry p {
            margin-bottom: 0.75rem;
            line-height: 1.6;
        }

        .beat-entry strong {
            color: #58a6ff;
            font-weight: 600;
        }

        .beat-entry hr {
            border: none;
            border-top: 1px solid #21262d;
            margin: 1.5rem 0 0 0;
        }

        .stats {
            background: #0d1117;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 1rem;
            margin-bottom: 2rem;
            display: grid;
            grid-template-columns: 1fr 2fr 1fr 2fr;
            gap: 1rem;
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }

        .stat {
            text-align: center;
        }

        .stat-value {
            font-size: 1.5rem;
            color: #58a6ff;
            font-weight: 600;
            transition: color 0.3s ease;
        }

        .stat-label {
            color: #8b949e;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: color 0.3s ease;
        }

        @media (max-width: 768px) {
            body {
                padding: 1rem;
            }
            
            .container {
                flex-direction: column;
                gap: 1rem;
            }
            
            .sidebar {
                position: static;
                width: 100%;
                order: -1;
            }
            
            h1 {
                font-size: 1.5rem;
            }
            
            .act-section {
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        ${sidebarHTML}
        
        <main class="main-content">
            <a href="/" class="back-link">← Back to Beat Sheets</a>
            
            <div class="header" id="overview">
                <div class="header-content">
                    <h1>ALLY - BEAT SHEETS REPORT</h1>
                    <div style="color: #58a6ff; font-size: 0.9rem; text-align: left;">As of ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
                <div style="text-align: right;">
                    <div style="margin-bottom: 0.5rem;">
                        <a href="/api/reports/beats/csv" target="_blank" style="color: #f85149; text-decoration: none; font-size: 0.9rem; padding: 0.5rem 1rem; border: 1px solid #30363d; border-radius: 4px; background: transparent;">📄 Download CSV</a>
                    </div>
                </div>
            </div>
            
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">${report.summary.total_acts}</div>
                    <div class="stat-label">Acts</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${report.summary.total_beats}</div>
                    <div class="stat-label">Total Beats</div>
                </div>
                <div class="stat">
                    <div class="stat-value">Mark</div>
                    <div class="stat-label">Director</div>
                </div>
                <div class="stat">
                    <div class="stat-value">MobiCycle Productions</div>
                    <div class="stat-label">Producer</div>
                </div>
            </div>
        
            ${beatsHTML}
            
        </main>
    </div>
</body>
</html>`;

  return html;
}

/**
 * Generate PDF-optimized HTML
 */
function generatePDFOptimizedHTML(report) {
  const html = generateHTMLReport(report);
  return html
    .replace('</head>', `
      <style>
        .actions { display: none !important; }
        body { padding: 0 !important; background: white !important; }
        .container { box-shadow: none !important; }
      </style>
    </head>`)
    .replace(/<div class="actions">[\s\S]*?<\/div>/, '');
}

/**
 * Generate CSV format report
 */
function generateCSVReport(report) {
  let csv = 'Act Number,Act Title,Beat Number,Scene Number,Beat Title,Description,Conflict,Emotion,Location,Time of Day,Characters,Version,Created At,Updated At\n';

  for (const act of report.acts) {
    for (const beat of act.beats) {
      const row = [
        act.act_no,
        escapeCSV(act.act_title || ''),
        beat.beat_number,
        beat.scene_number || '',
        escapeCSV(beat.title || ''),
        escapeCSV(beat.description || ''),
        escapeCSV(beat.conflict || ''),
        escapeCSV(beat.emotion || ''),
        escapeCSV(beat.location || ''),
        escapeCSV(beat.time_of_day || ''),
        escapeCSV(beat.characters || ''),
        beat.version || '',
        beat.created_at || '',
        beat.updated_at || ''
      ];
      csv += row.join(',') + '\n';
    }
  }

  return csv;
}

/**
 * Escape CSV field values
 */
function escapeCSV(field) {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Handle report routing for /dashboard and /api/reports endpoints
 */
async function handleReportRouting(request, env, path, method, corsHeaders) {
  if (method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  if (path === '/api/reports/beats') {
    return await handleReportRequest(env, 'json', corsHeaders);
  }

  if (path === '/api/reports/beats/csv') {
    return await handleReportRequest(env, 'csv', corsHeaders);
  }

  if (path === '/api/reports/beats/html') {
    return await handleReportRequest(env, 'html', corsHeaders);
  }

  if (path === '/api/reports/beats/pdf') {
    return await handleReportRequest(env, 'pdf', corsHeaders);
  }

  return jsonResponse({ error: 'Invalid report endpoint' }, 400, corsHeaders);
}

/**
 * Handle report generation requests
 */
async function handleReportRequest(env, format, corsHeaders) {
  try {
    const report = await generateBeatReport(env, format);

    if (format === 'csv') {
      return new Response(report, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="beat-sheets-report-${new Date().toISOString().split('T')[0]}.csv"`,
          ...corsHeaders
        }
      });
    }

    if (format === 'html') {
      return new Response(report, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          ...corsHeaders
        }
      });
    }

    if (format === 'pdf') {
      return new Response(report, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
          ...corsHeaders
        }
      });
    }

    return jsonResponse(report, 200, corsHeaders);
  } catch (error) {
    console.error('Report generation failed:', error);
    return jsonResponse({
      error: 'Report generation failed',
      message: error.message
    }, 500, corsHeaders);
  }
}

/**
 * Generate consistent header template for all pages
 */
function generatePageHeader(title, subtitle, subtitleColor = '#888') {
  return `
    <div class="header">
        <h1>${title}</h1>
        <p class="subtitle" style="color: ${subtitleColor}; font-weight: 600;">${subtitle}</p>
    </div>
  `;
}

/**
 * Check if request is authenticated via Cloudflare Access JWT
 */
function isAuthenticated(request, env) {
  const cfAccessJwt = request.headers.get('Cf-Access-Jwt-Assertion');
  
  if (cfAccessJwt) {
    return true;
  }

  if (env.API_KEY) {
    const apiKeyHeader = request.headers.get('X-API-Key') || 
                        request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (apiKeyHeader) {
      return apiKeyHeader === env.API_KEY;
    }
  }

  return false;
}

/**
 * Generate acts overview page
 */
function generateActsOverview(corsHeaders) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ALLY - Beat Sheets Overview</title>
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
            padding: 2rem;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid #333;
        }

        .header h1 {
            font-size: 3rem;
            font-weight: 300;
            margin-bottom: 1rem;
            font-family: Georgia, 'Times New Roman', serif;
            letter-spacing: 2px;
        }

        .header .subtitle {
            font-size: 1.2rem;
            color: #888;
        }

        .nav {
            margin-bottom: 2rem;
        }

        .nav a {
            color: #fff;
            text-decoration: none;
            font-size: 1rem;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            transition: background 0.2s;
        }

        .nav a:hover {
            background: #333;
        }

        .acts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }

        .act-card {
            background: #111;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 2rem;
            transition: border-color 0.2s;
        }

        .act-card:hover {
            border-color: #555;
        }

        .act-card h3 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: #fff;
        }

        .act-card p {
            color: #ccc;
            line-height: 1.6;
        }

        .act-card a {
            color: inherit;
            text-decoration: none;
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 2rem;
            }
            
            .acts-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        ${generatePageHeader('ALLY', 'BEAT SHEETS OVERVIEW', '#f85149')}
        
        <div class="nav">
            <a href="/">&larr; Back to Projects</a>
        </div>

        <div class="acts-grid">
            <div class="act-card">
                <a href="/ally/beats/all">
                    <h3 style="color: #667eea;">All Beats</h3>
                    <p>Complete beat sheet across all acts with detailed scene breakdown and export options.</p>
                </a>
            </div>
            
            <div class="act-card">
                <a href="/ally/act/1">
                    <h3>Act 1 Beats</h3>
                    <p>The beginning beats of Ally's journey. Each beat represents one scene in the opening act.</p>
                </a>
            </div>
            
            <div class="act-card">
                <a href="/ally/act/2">
                    <h3>Act 2A Beats</h3>
                    <p>First half of the second act beats, where the plot thickens and challenges mount.</p>
                </a>
            </div>
            
            <div class="act-card">
                <a href="/ally/act/2b">
                    <h3>Act 2B Beats</h3>
                    <p>Second half of act two beats, building toward the climactic confrontation.</p>
                </a>
            </div>
            
            <div class="act-card">
                <a href="/ally/act/3">
                    <h3>Act 3 Beats</h3>
                    <p>The climactic beats where all story threads come together for the final resolution.</p>
                </a>
            </div>
            
            <div class="act-card">
                <a href="https://sequences.mobicycle.productions/">
                    <h3 style="color: #58a6ff;">Sequences</h3>
                    <p>View the broader sequence structure that contains these beats. Login required.</p>
                </a>
            </div>
        </div>
    </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      ...corsHeaders
    }
  });
}

/**
 * Generate all beats page
 */
async function generateAllBeatsPage(env, corsHeaders) {
  try {
    const db = env.SCREENPLAY_DRAFT;
    
    const beats = await db.prepare(`
      SELECT 
        b.beat_number,
        b.scene_number,
        b.title,
        b.description,
        a.act_no,
        a.title as act_title
      FROM beats b
      JOIN acts a ON b.act_id = a.id
      WHERE b.is_current = 1
      ORDER BY a.act_no, b.beat_number
    `).all();

    let allBeatCards = '';
    
    if (beats.results.length === 0) {
      allBeatCards = `
        <div class="no-content">
          <h2>No Beats Found</h2>
          <p>There are currently no beats in the database. Add some beats to see them here.</p>
        </div>
      `;
    } else {
      const beatsByAct = {};
      beats.results.forEach(beat => {
        if (!beatsByAct[beat.act_no]) {
          beatsByAct[beat.act_no] = {
            title: beat.act_title,
            beats: []
          };
        }
        beatsByAct[beat.act_no].beats.push(beat);
      });

      Object.entries(beatsByAct).forEach(([actNo, act]) => {
        allBeatCards += `<div class="act-divider"><h2>${act.title}</h2></div>`;
        
        act.beats.forEach(beat => {
          allBeatCards += `
            <div class="beat-card">
              <a href="/ally/act/${actNo}/beat/${beat.beat_number}">
                <h3>Beat ${beat.beat_number} ${beat.scene_number ? `(Scene ${beat.scene_number})` : ''}</h3>
                <p>${beat.title || `Beat ${beat.beat_number} from ${act.title}`}</p>
              </a>
            </div>
          `;
        });
      });
    }
  } catch (error) {
    console.error('Database error in generateAllBeatsPage:', error);
    allBeatCards = `
      <div class="error-content">
        <h2>Database Error</h2>
        <p>Unable to load beats. Please try again later.</p>
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ALLY - All Beats</title>
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
            padding: 2rem;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid #333;
        }

        .header h1 {
            font-size: 3rem;
            font-weight: 300;
            margin-bottom: 1rem;
            font-family: Georgia, 'Times New Roman', serif;
            letter-spacing: 2px;
        }

        .header .subtitle {
            font-size: 1.2rem;
            color: #888;
        }

        .nav {
            margin-bottom: 2rem;
        }

        .nav a {
            color: #fff;
            text-decoration: none;
            font-size: 1rem;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            transition: background 0.2s;
        }

        .nav a:hover {
            background: #333;
        }

        .act-divider {
            margin: 3rem 0 2rem 0;
            text-align: center;
            border-top: 2px solid #333;
            padding-top: 2rem;
        }

        .act-divider:first-of-type {
            margin-top: 0;
            border-top: none;
            padding-top: 0;
        }

        .act-divider h2 {
            font-size: 1.8rem;
            color: #667eea;
            font-weight: 600;
            margin-bottom: 1rem;
        }

        .beats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }

        .beat-card {
            background: #111;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 2rem;
            transition: border-color 0.2s;
        }

        .beat-card:hover {
            border-color: #555;
        }

        .beat-card h3 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: #fff;
        }

        .beat-card p {
            color: #ccc;
            line-height: 1.6;
        }

        .beat-card a {
            color: inherit;
            text-decoration: none;
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 2rem;
            }
            
            .beats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        ${generatePageHeader('ALLY', 'All Beats - Complete Beat Sheet Overview')}
        
        <div class="nav">
            <a href="/ally">&larr; Back to Acts</a>
        </div>

        <div class="beats-grid">
            ${allBeatCards}
        </div>
    </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      ...corsHeaders
    }
  });
}

/**
 * Generate act-specific beats page
 */
async function generateActBeatsPage(actNumber, env, corsHeaders) {
  let actTitle = `Act ${actNumber}`;
  let beatCards = '';
  
  try {
    const db = env.SCREENPLAY_DRAFT;
    
    const beats = await db.prepare(`
      SELECT 
        b.beat_number,
        b.scene_number,
        b.title,
        b.description,
        a.title as act_title
      FROM beats b
      JOIN acts a ON b.act_id = a.id
      WHERE a.act_no = ? AND b.is_current = 1
      ORDER BY b.beat_number
    `).bind(actNumber).all();
    
    if (beats.results.length === 0) {
      const actInfo = await db.prepare(`
        SELECT title FROM acts WHERE act_no = ?
      `).bind(actNumber).first();
      
      if (actInfo) {
        actTitle = actInfo.title;
      }
      
      beatCards = `
        <div class="beat-card">
          <div style="text-align: center; padding: 3rem; color: #8b949e;">
            <h3>No Beats Found</h3>
            <p>There are currently no beats for ${actTitle}. Add some beats to see them here.</p>
          </div>
        </div>
      `;
    } else {
      actTitle = beats.results[0].act_title;
      
      beatCards = beats.results.map(beat => `
        <div class="beat-card">
          <a href="/ally/act/${actNumber}/beat/${beat.beat_number}">
            <h3>Beat ${beat.beat_number} ${beat.scene_number ? `(Scene ${beat.scene_number})` : ''}</h3>
            <p>${beat.title || `Beat ${beat.beat_number} content for ${actTitle}`}</p>
          </a>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Database error in generateActBeatsPage:', error);
    beatCards = `
      <div class="beat-card">
        <div style="text-align: center; padding: 3rem; color: #f85149;">
          <h3>Database Error</h3>
          <p>Unable to load beats for ${actTitle}. Please try again later.</p>
        </div>
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ALLY - ${actTitle} Beats</title>
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
            padding: 2rem;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid #333;
        }

        .header h1 {
            font-size: 3rem;
            font-weight: 300;
            margin-bottom: 1rem;
            font-family: Georgia, 'Times New Roman', serif;
            letter-spacing: 2px;
        }

        .header .subtitle {
            font-size: 1.2rem;
            color: #888;
        }

        .nav {
            margin-bottom: 2rem;
        }

        .nav a {
            color: #fff;
            text-decoration: none;
            font-size: 1rem;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            transition: background 0.2s;
        }

        .nav a:hover {
            background: #333;
        }

        .beats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }

        .beat-card {
            background: #111;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 2rem;
            transition: border-color 0.2s;
        }

        .beat-card:hover {
            border-color: #555;
        }

        .beat-card h3 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: #fff;
        }

        .beat-card p {
            color: #ccc;
            line-height: 1.6;
        }

        .beat-card a {
            color: inherit;
            text-decoration: none;
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 2rem;
            }
            
            .beats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        ${generatePageHeader('ALLY', `ACT ${actNumber} BEATS`, '#f85149')}
        
        <div class="nav">
            <a href="/ally">&larr; Back to Acts</a>
        </div>

        <div class="beats-grid">
            <div class="beat-card">
                <a href="/ally/beats/all">
                    <h3 style="color: #667eea;">All Beats</h3>
                    <p>View all beats across all acts with navigation to individual beat details.</p>
                </a>
            </div>
            ${beatCards}
        </div>
    </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      ...corsHeaders
    }
  });
}