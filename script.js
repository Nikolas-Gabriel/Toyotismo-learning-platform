import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, collection, setDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyCEtHtkdtEQ52M21idSU_mEGJxUEB8lhzk", 
    authDomain: "quizzz-a9570.firebaseapp.com", 
    projectId: "quizzz-a9570" 
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const banco = [
  { pergunta:"Quem foi Taiichi Ohno?", respostas:["Presidente","Cientista","Engenheiro da Toyota"], correta:2 },
  { pergunta:"Sistema Toyota busca:", respostas:["Desperdício","Qualidade","Ignorar"], correta:1 },
  { pergunta:"Just in Time:", respostas:["Antes","Na hora certa","Sem controle"], correta:1 },
  { pergunta:"O que é Kaizen?", respostas:["Erro","Melhoria contínua","Parar"], correta:1 },
  { pergunta:"Produção puxada foca na:", respostas:["Estoque","Demanda","Máquinas"], correta:1 },
  { pergunta:"Kanban é um sistema de:", respostas:["Controle visual","Erro","Transporte"], correta:0 },
  { pergunta:"Objetivo do Toyotismo:", respostas:["Bagunça","Eficiência","Lentidão"], correta:1 }
];

let perguntas=[], indice=0, acertos=0, nome="", turmaSelecionada="", tempoInicio, intervaloTimer;

// Formata o tempo para 00:00
const formatarTempo = (s) => {
    if (s === undefined || s === null || isNaN(s)) return "00:00";
    const min = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${min}:${sec}`;
};

document.addEventListener('click', (e) => {
    if(e.target.classList.contains('turma')) {
        document.querySelectorAll(".turma").forEach(x => x.classList.remove("ativa"));
        e.target.classList.add("ativa");
        turmaSelecionada = e.target.innerText;
        document.getElementById("msgErro").classList.add("hidden");
    }
});

document.getElementById("btnIniciar").onclick = () => {
  nome = document.getElementById("nome").value.trim();
  if(!nome || !turmaSelecionada) {
    document.getElementById("msgErro").classList.remove("hidden");
    return;
  }
  comecar();
};

document.getElementById("btnVerRankingApenas").onclick = () => {
  if(!turmaSelecionada) {
    document.getElementById("msgErro").innerText = "⚠️ Escolha uma turma primeiro!";
    document.getElementById("msgErro").classList.remove("hidden");
    return;
  }
  finalizar(true);
};

function comecar() {
  perguntas = [...banco].sort(() => Math.random() - 0.5);
  indice = 0; acertos = 0;
  document.getElementById("inicio").classList.add("hidden");
  document.getElementById("quiz").classList.remove("hidden");
  
  // LOGICA DO CRONÔMETRO EM TEMPO REAL
  tempoInicio = Date.now();
  clearInterval(intervaloTimer); 
  
  intervaloTimer = setInterval(() => {
    let agora = Date.now();
    let decorrido = Math.floor((agora - tempoInicio) / 1000);
    const timerElemento = document.getElementById("timer");
    if(timerElemento) {
        // Mostra o relógio com ícone igual ao do resultado
        timerElemento.innerText = `⏱️ ${formatarTempo(decorrido)}`;
    }
  }, 1000);

  mostrar();
}

function mostrar() {
  if(indice >= 7) { finalizar(false); return; }
  let p = perguntas[indice];
  document.getElementById("pergunta").innerText = p.pergunta;
  document.getElementById("contador").innerText = `Questão ${indice + 1}/7`;
  const resEl = document.getElementById("respostas");
  resEl.innerHTML = "";
  
  p.respostas.forEach((r, i) => {
    let b = document.createElement("button");
    b.innerText = r;
    b.onclick = () => {
      document.querySelectorAll("#respostas button").forEach(btn => btn.disabled = true);
      if(i === p.correta) { acertos++; b.classList.add("certa"); }
      else b.classList.add("errada");
      setTimeout(() => { 
        indice++; 
        document.getElementById("barra").style.width = (indice/7)*100+"%"; 
        mostrar(); 
      }, 600);
    };
    resEl.appendChild(b);
  });
}

async function finalizar(soRanking) {
  clearInterval(intervaloTimer); // Para o relógio
  const tempoFinal = Math.floor((Date.now() - tempoInicio) / 1000);
  
  const resDiv = document.getElementById("resultado");
  resDiv.innerHTML = "<div class='card'><h3>🚀 Sincronizando ranking...</h3></div>";
  resDiv.classList.remove("hidden");
  document.getElementById("quiz").classList.add("hidden");
  document.getElementById("inicio").classList.add("hidden");

  try {
    if(!soRanking) {
      let id = `${nome}_${turmaSelecionada}`.replace(/\s+/g,"_");
      await setDoc(doc(db,"resultados",id), { nome, turma: turmaSelecionada, acertos, tempo: tempoFinal });
    }

    const snap = await getDocs(collection(db,"resultados"));
    let global = [], turma = [], turmasMap = {};
    
    snap.forEach(d => {
      let dados = d.data();
      global.push(dados);
      if(dados.turma === turmaSelecionada) turma.push(dados);
      if(!turmasMap[dados.turma]) turmasMap[dados.turma] = {s:0, n:0};
      turmasMap[dados.turma].s += dados.acertos; turmasMap[dados.turma].n++;
    });

    const ordenarRanking = (a, b) => {
        if (b.acertos !== a.acertos) return b.acertos - a.acertos;
        return (a.tempo || 3600) - (b.tempo || 3600);
    };

    global.sort(ordenarRanking);
    turma.sort(ordenarRanking);

    const mediaTurma = (turmasMap[turmaSelecionada]?.s / (turmasMap[turmaSelecionada]?.n * 7)) * 100 || 0;

    resDiv.innerHTML = `
      <div id="cardFinal" class="card animar" style="${soRanking ? 'display:none' : 'display:block'}">
        <h2>🎉 Resultado</h2>
        <p style="color:#ff0000; font-size:22px; font-weight:bold;">${nome}</p>
        <h3>✅ ${acertos}/7 | ⏱️ ${formatarTempo(tempoFinal)}</h3>
        <h1 style="font-size:35px;">${((acertos/7)*100).toFixed(1)}%</h1>
        <button id="abrirRankings" class="btn-principal">📊 Ver Rankings</button>
        <button onclick="location.reload()" class="btn-secundario">🔄 Voltar</button>
      </div>

      <div id="telaRanking" class="animar" style="${soRanking ? 'display:grid' : 'display:none'}">
        <div class="card">
          <h3>🏆 Top 5: ${turmaSelecionada}</h3>
          ${turma.slice(0,5).map((a,i)=>`<div class="linha-ranking"><span>${i+1}º ${a.nome}</span> <b>${a.acertos}pts | ${formatarTempo(a.tempo)}</b></div>`).join("")}
          <button id="btnVerTodos" class="btn-secundario" style="font-size:12px; padding:6px; margin-top:10px;">Ver todos da turma</button>
        </div>
        
        <div class="card">
          <h3>🌎 Top 5 Global</h3>
          ${global.slice(0,5).map((a,i)=>`<div class="linha-ranking"><span>${i+1}º ${a.nome}</span> <b>${a.acertos}pts | ${formatarTempo(a.tempo)}</b></div>`).join("")}
        </div>

        <div class="card full-width ${soRanking ? 'hidden' : ''}">
          <h3>📊 Estatísticas</h3>
          <div class="canvas-wrapper"><canvas id="graficoDesempenho"></canvas></div>
        </div>

        <div class="card full-width">
          <h3>🏫 Ranking das Turmas</h3>
          ${Object.keys(turmasMap).map(t => ({t, m: (turmasMap[t].s/(turmasMap[t].n*7))*100})).sort((a,b)=>b.m-a.m).map((t,i)=>`
            <div class="linha-ranking"><span>${i+1}º ${t.t}</span> <b style="color:#ff0000">${t.m.toFixed(0)}%</b></div>
          `).join("")}
        </div>

        <button id="btnVoltarRes" class="btn-secundario full-width">⬅ Voltar</button>
      </div>

      <div id="telaSubLista" class="animar hidden">
        <div class="card">
          <h3>👥 Lista Completa: ${turmaSelecionada}</h3>
          <div style="max-height: 400px; overflow-y: auto;">
            ${turma.map((a,i)=>`
              <div class="linha-ranking">
                  <span>${i+1}º ${a.nome}</span> 
                  <b>${a.acertos}pts | ${formatarTempo(a.tempo)}</b>
              </div>
            `).join("")}
          </div>
          <button id="btnFecharLista" class="btn-secundario" style="margin-top:15px;">⬅ Voltar</button>
        </div>
      </div>
    `;

    // Navegação e Gráfico mantidos iguais...
    const divRanking = document.getElementById("telaRanking");
    const divSubLista = document.getElementById("telaSubLista");

    document.getElementById("btnVerTodos").onclick = () => {
        divRanking.style.display = "none";
        divSubLista.classList.remove("hidden");
    };

    document.getElementById("btnFecharLista").onclick = () => {
        divSubLista.classList.add("hidden");
        divRanking.style.display = "grid";
    };

    document.getElementById("abrirRankings").onclick = () => {
        document.getElementById("cardFinal").style.display = "none";
        divRanking.style.display = "grid";
        renderizarGrafico(mediaTurma);
    };

    document.getElementById("btnVoltarRes").onclick = () => {
        if(soRanking) location.reload();
        else {
            document.getElementById("cardFinal").style.display = "block";
            divRanking.style.display = "none";
        }
    };

  } catch (err) {
    resDiv.innerHTML = "<div class='card'><h3>Erro de conexão.</h3><button onclick='location.reload()'>Tentar</button></div>";
  }

  function renderizarGrafico(media) {
    const ctx = document.getElementById("graficoDesempenho");
    if(!ctx) return;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Você', 'Média'],
        datasets: [{ data: [(acertos/7)*100, media], backgroundColor: ['#ff0000', '#444'], borderRadius: 5 }]
      },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
    });
  }
}