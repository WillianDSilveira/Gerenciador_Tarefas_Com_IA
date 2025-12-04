import 'dotenv/config'; // Carrega as variáveis do .env
import express from 'express';
import mysql from 'mysql2/promise';
import { GoogleGenAI } from '@google/genai';
import cors from 'cors';

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Permite que o Angular (Frontend) se conecte
app.use(express.json()); // Permite que o Express leia JSON no corpo da requisição

// --- Configuração da IA e do Banco de Dados ---

// Inicializa a Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Configura a pool de conexão do MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

/**
 * Função principal para gerar o título da tarefa usando a Gemini API.
 * (Cobre o requisito de "consumir uma API de IA")
 */
async function generateTitle(description) {
    // Prompt que define o comportamento da IA
    const prompt = `Você é um gerador de títulos de tarefas concisos. Dado o texto a seguir, crie um título curto (máximo 8 palavras) e chamativo para esta tarefa. Retorne APENAS o título, sem introduções, aspas ou explicações.

Descrição: "${description}"`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Modelo rápido para tarefas de texto
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        
        // O texto gerado pela IA
        const generatedText = response.text.trim();
        
        // Retorna o título, removendo aspas extras que a IA possa adicionar
        return generatedText.replace(/['"]+/g, '');

    } catch (error) {
        console.error("Erro ao comunicar com a Gemini API:", error);
        // Em caso de falha da IA, retorna um título genérico
        return "Nova Tarefa (IA indisponível)";
    }
}

// --- Rotas da API (CRUD Básico) ---

// 1. Rota de Criação de Tarefa (POST)
app.post('/tasks', async (req, res) => {
    // **Lógica de programação e Estrutura de Dados:** Recebe os dados
    const { description, due_date } = req.body;

    if (!description) {
        return res.status(400).send({ message: "A descrição da tarefa é obrigatória." });
    }

    // 1. Gera o título usando a IA
    const title = await generateTitle(description);

    try {
        // **Banco Relacional (CRUD Básico):** Query de Inserção
        const [result] = await pool.execute(
            'INSERT INTO tasks (title, description, due_date) VALUES (?, ?, ?)',
            [title, description, due_date || null]
        );

        res.status(201).send({
            id: result.insertId,
            title,
            description,
            due_date,
            status: 'Pendente'
        });
    } catch (error) {
        console.error("Erro ao inserir tarefa no MySQL:", error);
        res.status(500).send({ message: "Erro interno do servidor ao criar tarefa." });
    }
});

// Rota de Leitura de Todas as Tarefas (GET)
app.get('/tasks', async (req, res) => {
    try {
        // Query de Seleção (READ do CRUD)
        const [rows] = await pool.execute('SELECT * FROM tasks ORDER BY id DESC');
        
        // Retorna o array de tarefas
        res.status(200).json(rows);

    } catch (error) {
        console.error("Erro ao buscar tarefas no MySQL:", error);
        res.status(500).send({ message: "Erro interno do servidor ao buscar tarefas." });
    }
});


// 3. Rota de Atualização (PUT /tasks/:id)
// Implementar: Query 'UPDATE tasks SET ... WHERE id = ?'

// 4. Rota de Deleção (DELETE /tasks/:id)
// Implementar: Query 'DELETE FROM tasks WHERE id = ?'


// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Backend Express rodando em http://localhost:${PORT}`);
});