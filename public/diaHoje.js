function atualizarDiaHoje() {
  const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const hoje = new Date();

  // Se for antes das 14:00, consideramos o dia anterior
  if (hoje.getHours() < 14) {
    hoje.setDate(hoje.getDate() - 1);
  }

  const indiceDia = hoje.getDay();
  const nomeDia = diasSemana[indiceDia];

  const pDiaHoje = document.getElementById('dia_hoje');
  pDiaHoje.textContent = `Hoje é ${nomeDia}.`;
}

atualizarDiaHoje();

function agendarAtualizacao14h() {
  const agora = new Date();
  const proximo14h = new Date();

  proximo14h.setHours(14, 0, 0, 0);
  if (agora >= proximo14h) {
    proximo14h.setDate(proximo14h.getDate() + 1);
  }

  const msAte14h = proximo14h.getTime() - agora.getTime();

  setTimeout(() => {
    atualizarDiaHoje();
    agendarAtualizacao14h();
  }, msAte14h);
}

agendarAtualizacao14h();