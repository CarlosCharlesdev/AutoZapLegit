function atualizarDiaHoje() {
  const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const hoje = new Date();

  // Se for antes das 12:00, consideramos o dia anterior
  if (hoje.getHours() < 12) {
    hoje.setDate(hoje.getDate() - 1);
  }

  const indiceDia = hoje.getDay();
  const nomeDia = diasSemana[indiceDia];

  const pDiaHoje = document.getElementById('dia_hoje');
  pDiaHoje.textContent = `Hoje é ${nomeDia}.`;
}

atualizarDiaHoje();

function agendarAtualizacao12h() {
  const agora = new Date();
  const proximo12h = new Date();

  proximo12h.setHours(12, 0, 0, 0);
  if (agora >= proximo12h) {
    proximo12h.setDate(proximo12h.getDate() + 1);
  }

  const msAte12h = proximo12h.getTime() - agora.getTime();

  setTimeout(() => {
    atualizarDiaHoje();
    agendarAtualizacao12h();
  }, msAte12h);
}

agendarAtualizacao12h();