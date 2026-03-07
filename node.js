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

// Números fixos para pedidos de pães (altere aqui para os números desejados)
const NUMEROS_PAES = [
  '556992254900',
  '556992077361'
];

// Números fixos para pedidos de carne (altere aqui para os números desejados)
const NUMEROS_CARNE = [
  '556992254900',
  '556992077361'
];

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para obter o consumo semanal
app.get('/consumo', (req, res) => {
  const consumo = JSON.parse(fs.readFileSync(consumoPath, 'utf-8'));
  res.json(consumo);
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
  const { restante, ...novoConsumo } = req.body;

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

  const requests = NUMEROS_CARNE.map(numero =>
    axios.post('https://gate.whapi.cloud/messages/text', {
      to: numero,
      body: corpoMensagem
    }, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    })
  );

  Promise.all(requests)
    .then(() => {
      res.json({
        mensagem: `✅ Pedido de ${quantidadePedir} Blends enviado para ${diaAmanha}.`,
        detalhes: corpoMensagem
      });
    })
    .catch(err => {
      console.error(err.response?.data || err.message);
      res.status(500).json({ mensagem: '❌ Erro ao enviar o pedido.' });
    });
});

// Endpoint para enviar pedido de pães
app.post('/enviar-paes', (req, res) => {
  const { brioche, baguete } = req.body;

  let corpoMensagem;

  if ((!brioche || brioche <= 0) && (!baguete || baguete <= 0)) {
    corpoMensagem = 'Hoje não precisamos de pães.';
  } else {
    corpoMensagem = 'Bom dia! Segue nosso pedido de pães:';
    if (brioche > 0) corpoMensagem += `\n  - ${brioche} unidades de Pão Brioche`;
    if (baguete > 0) corpoMensagem += `\n  - ${baguete} unidades de Pão Baguete`;
  }

  const requests = NUMEROS_PAES.map(numero =>
    axios.post('https://gate.whapi.cloud/messages/text', {
      to: numero,
      body: corpoMensagem
    }, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    })
  );

  Promise.all(requests)
    .then(() => {
      res.json({
        mensagem: `✅ Pedido de pães enviado com sucesso!`,
        detalhes: corpoMensagem
      });
    })
    .catch(err => {
      console.error(err.response?.data || err.message);
      res.status(500).json({ mensagem: '❌ Erro ao enviar o pedido de pães.' });
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