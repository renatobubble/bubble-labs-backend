// ═══════════════════════════════════════════════════════════════════
// BACKEND SIMPLES - Sincroniza com Google Sheets + Notion
// Deploy no Vercel: npx vercel deploy --prod
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ─── GOOGLE SHEETS ────────────────────────────────────────────────
async function salvarNoGoogleSheets(dados, googleSheetId, accessToken) {
  try {
    const valores = [
      [
        new Date().toLocaleString('pt-BR'),
        dados.mesAno || '',
        dados.saldoInicial || 0,
        dados.totalReceitas || 0,
        dados.totalDespesas || 0,
        (dados.saldoInicial + dados.totalReceitas - dados.totalDespesas) || 0,
        dados.observacoes || ''
      ]
    ];

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetId}/values/A1:append?valueInputOption=USER_ENTERED&key=${process.env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: valores
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Google Sheets error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao salvar no Google Sheets:', error);
    throw error;
  }
}

// ─── NOTION ───────────────────────────────────────────────────────
async function salvarNoNotion(dados, notionDatabaseId, notionToken) {
  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: {
          database_id: notionDatabaseId
        },
        properties: {
          'Data': {
            date: {
              start: new Date().toISOString().split('T')[0]
            }
          },
          'Mês/Ano': {
            title: [
              {
                text: {
                  content: dados.mesAno || new Date().toLocaleDateString('pt-BR')
                }
              }
            ]
          },
          'Saldo Inicial': {
            number: parseFloat(dados.saldoInicial) || 0
          },
          'Receitas': {
            number: parseFloat(dados.totalReceitas) || 0
          },
          'Despesas': {
            number: parseFloat(dados.totalDespesas) || 0
          },
          'Saldo Final': {
            number: (parseFloat(dados.saldoInicial) + parseFloat(dados.totalReceitas) - parseFloat(dados.totalDespesas)) || 0
          },
          'Observações': {
            rich_text: [
              {
                text: {
                  content: dados.observacoes || ''
                }
              }
            ]
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Notion error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao salvar no Notion:', error);
    throw error;
  }
}

// ─── ENDPOINTS ────────────────────────────────────────────────────

/**
 * POST /api/sync
 * Sincroniza dados com Google Sheets e Notion
 */
app.post('/api/sync', async (req, res) => {
  try {
    const {
      dados,
      googleSheetId,
      googleAccessToken,
      notionDatabaseId,
      notionToken
    } = req.body;

    if (!dados) {
      return res.status(400).json({
        success: false,
        error: 'Dados não fornecidos'
      });
    }

    const results = {
      success: true,
      googleSheets: null,
      notion: null,
      errors: []
    };

    // Salvar no Google Sheets
    if (googleSheetId && googleAccessToken) {
      try {
        results.googleSheets = await salvarNoGoogleSheets(
          dados,
          googleSheetId,
          googleAccessToken
        );
      } catch (error) {
        results.errors.push(`Google Sheets: ${error.message}`);
      }
    }

    // Salvar no Notion
    if (notionDatabaseId && notionToken) {
      try {
        results.notion = await salvarNoNotion(
          dados,
          notionDatabaseId,
          notionToken
        );
      } catch (error) {
        results.errors.push(`Notion: ${error.message}`);
      }
    }

    if (results.errors.length === 0) {
      return res.json({
        success: true,
        message: 'Dados sincronizados com sucesso!',
        results
      });
    } else {
      return res.json({
        success: false,
        message: 'Erro ao sincronizar',
        errors: results.errors,
        results
      });
    }
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/sync/sheets
 * Sincroniza apenas com Google Sheets
 */
app.post('/api/sync/sheets', async (req, res) => {
  try {
    const { dados, googleSheetId, googleAccessToken } = req.body;

    if (!dados || !googleSheetId || !googleAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'Dados incompletos'
      });
    }

    const result = await salvarNoGoogleSheets(
      dados,
      googleSheetId,
      googleAccessToken
    );

    return res.json({
      success: true,
      message: 'Dados salvos no Google Sheets!',
      result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/sync/notion
 * Sincroniza apenas com Notion
 */
app.post('/api/sync/notion', async (req, res) => {
  try {
    const { dados, notionDatabaseId, notionToken } = req.body;

    if (!dados || !notionDatabaseId || !notionToken) {
      return res.status(400).json({
        success: false,
        error: 'Dados incompletos'
      });
    }

    const result = await salvarNoNotion(
      dados,
      notionDatabaseId,
      notionToken
    );

    return res.json({
      success: true,
      message: 'Dados salvos no Notion!',
      result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Bubble Labs Sync API'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em porta ${PORT}`);
});

module.exports = app;
