import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

const TOKEN = process.env.TOKEN;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const consumoPath = path.join(__dirname, 'consumo.json');
const numeroPath = path.join(__dirname, 'numero-destino.json');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializa o arquivo numero-destino.json se não existir
if (!fs.existsSync(numeroPath)) {
  fs.writeFileSync(numeroPath, JSON.stringify({ numero: '' }, null, 2));
}

// Endpoint para obter o consumo semanal
app.get('/consumo', (req, res) => {
  const consumo = JSON.parse(fs.readFileSync(consumoPath, 'utf-8'));
  res.json(consumo);
});

// Endpoint para obter o número de destino salvo
app.get('/numero-destino', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(numeroPath, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.json({ numero: '' });
  }
});

// Endpoint para salvar o número de destino
app.post('/salvar-numero', (req, res) => {
  const { numero } = req.body;
  
  if (!numero) {
    return res.status(400).json({ mensagem: 'Número não fornecido.' });
  }

  fs.writeFileSync(numeroPath, JSON.stringify({ numero }, null, 2));
  res.json({ mensagem: 'Número salvo com sucesso!', numero });
});

function obterDiaAtual() {
  const agora = new Date();
  if (agora.getHours() < 3) {
    agora.setDate(agora.getDate() - 1);
  }
  return agora.getDay();
}

// Endpoint para enviar o pedido via WhatsApp
app.post('/enviar', (req, res) => {
  const { restante, numeroDestino, ...novoConsumo } = req.body;

  // Salva o consumo atualizado
  fs.writeFileSync(consumoPath, JSON.stringify(novoConsumo, null, 2));

  const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

  const hoje = obterDiaAtual();
  const amanha = (hoje + 1) % 7;

  const diaAmanha = diasSemana[amanha];
  const consumoAmanha = novoConsumo[diaAmanha];

  const falta = Math.max(consumoAmanha - restante, 0);
  const quantidadePedir = falta === 0 ? 0 : Math.ceil(falta / 50) * 50;

  const fraldinha = (quantidadePedir * 0.08).toFixed(0);
  const acem = (quantidadePedir * 0.08).toFixed(0);
  const gordura = (quantidadePedir * 0.02).toFixed(0);

  let corpoMensagem = '';

  if (quantidadePedir === 0) {
    corpoMensagem = `Hoje sobrou o suficiente, não precisa pedir mais carne para ${diaAmanha}.`;
  } else {
    corpoMensagem = `Bom dia! Segue nosso pedido do dia:
  - ${fraldinha}kg de fraldinha
  - ${acem}kg de acém
  - ${gordura}kg de gordura de peito`;
  }

  // Usa o número fornecido no formulário ou o salvo no JSON
  let numeroFinal = numeroDestino || '';
  
  if (!numeroFinal) {
    try {
      const data = JSON.parse(fs.readFileSync(numeroPath, 'utf-8'));
      numeroFinal = data.numero || '';
    } catch (err) {
      console.error('Erro ao ler número salvo:', err);
    }
  }

  if (!numeroFinal) {
    return res.status(400).json({ 
      mensagem: '❌ Nenhum número de destino configurado.',
      detalhes: 'Por favor, configure o número de destino antes de enviar o pedido.'
    });
  }

  // Salva o número usado se foi fornecido no formulário
  if (numeroDestino) {
    fs.writeFileSync(numeroPath, JSON.stringify({ numero: numeroDestino }, null, 2));
  }

  axios.post('https://gate.whapi.cloud/messages/text', {
    to: numeroFinal,
    body: corpoMensagem
  }, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  }).then(() => {
    res.json({
      mensagem: `✅ Pedido de ${quantidadePedir} Blends enviado para ${diaAmanha}.`,
      detalhes: corpoMensagem
    });
  }).catch(err => {
    console.error(err.response?.data || err.message);
    res.status(500).json({ mensagem: '❌ Erro ao enviar o pedido.' });
  });
});

// Endpoint para alterar consumo de um dia específico
app.post('/alterar-consumo', (req, res) => {
  const novoValor = req.body;

  const consumo = JSON.parse(fs.readFileSync(consumoPath, 'utf-8'));
  Object.assign(consumo, novoValor);

  fs.writeFileSync(consumoPath, JSON.stringify(consumo, null, 2));
  res.json({ mensagem: 'Consumo atualizado com sucesso.' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});