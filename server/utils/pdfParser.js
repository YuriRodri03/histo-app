// server/utils/pdfParser.js
function extractDataFromText(text) {
    const data = {};

  // Extrair nome e matrícula
  const nomeMatriculaMatch = text.match(/(\d+)\s*([A-Z\s]+)\s*Nome:/);
  if (nomeMatriculaMatch) {
      data.matricula = nomeMatriculaMatch[1].trim(); // Captura a matrícula
      data.nome = nomeMatriculaMatch[2].trim(); // Captura o nome
  } else {
      data.matricula = 'Não encontrado';
      data.nome = 'Não encontrado';
  }

  // Extrair dados pessoais
  const dataNascimentoMatch = text.match(/Data de Nascimento:\s*([^\n]+)/);
  data.dataNascimento = dataNascimentoMatch ? dataNascimentoMatch[1].trim() : 'Não encontrado';

  const identidadeMatch = text.match(/Identidade:\s*([^\n]+)/);
  data.identidade = identidadeMatch ? identidadeMatch[1].trim() : 'Não encontrado';

  const localNascimentoMatch = text.match(/Local de Nascimento:\s*([^\n]+)/);
  data.localNascimento = localNascimentoMatch ? localNascimentoMatch[1].trim() : 'Não encontrado';

  const nomeMaeMatch = text.match(/Nome da Mãe:\s*([^\n]+)/);
  data.nomeMae = nomeMaeMatch ? nomeMaeMatch[1].trim() : 'Não encontrado';

  // Extrair dados do curso
  const dadosCursoMatch = text.match(/Dados do Curso\s*([\s\S]*?)(?=\nDados da Instituição)/);
  if (dadosCursoMatch) {
      const dadosCursoText = dadosCursoMatch[1].trim();

      // Extrair o curso
      const cursoMatch = dadosCursoText.match(/Habilitação:\s*([^\n]+)/);
      data.curso = cursoMatch ? cursoMatch[1].trim() : 'Não encontrado';

      // Extrair município do curso
      const municipioCursoMatch = dadosCursoText.match(/Município:\s*([^\n]+)/);
      data.municipioCurso = municipioCursoMatch ? municipioCursoMatch[1].trim() : 'Não encontrado';

      // Extrair modalidade
      const modalidadeMatch = dadosCursoText.match(/Modalidade:\s*([^\n]+)/);
      data.modalidade = modalidadeMatch ? modalidadeMatch[1].trim() : 'Não encontrado';

  } else {
      data.curso = 'Não encontrado';
      data.municipioCurso = 'Não encontrado';
      data.modalidade = 'Não encontrado';
  }

  // Extrair dados acadêmicos
  const iraIndividualMatch = text.match(/IRA\s*-\s*Individual:\s*(\d+\.\d+)/);
  data.iraIndividual = iraIndividualMatch ? iraIndividualMatch[1].trim() : 'Não encontrado';

  const iraGeralMatch = text.match(/IRA\s*-\s*Geral:\s*(\d+\.\d+)/);
  data.iraGeral = iraGeralMatch ? iraGeralMatch[1].trim() : 'Não encontrado';

  const anoPeriodoInicialMatch = text.match(/Ato Normativo:\s*(\d+\.\d+)/);
  data.anoPeriodoInicial = anoPeriodoInicialMatch ? anoPeriodoInicialMatch[1].trim() : 'Não encontrado';

  const previsaoConclusaoMatch = text.match(/Para o para Conclusão:\s*([^\n]+)/);
  data.previsaoConclusao = previsaoConclusaoMatch ? previsaoConclusaoMatch[1].trim() : 'Não encontrado';

  // Extrair componentes curriculares
  
  const linhas = text.split('\n').map(l => l.trim()).filter(l => l !== ""); // Remove espaços extras e linhas vazias

  let componentes = [];
  let coletandoComponentes = false;
  let semestresColetados = new Set(); // Usamos um Set para armazenar os semestres já coletados

  for (let i = 0; i < linhas.length; i++) {
      let linha = linhas[i];

      if (linha.includes('Componentes Curriculares Cursados/Cursando')) {
          coletandoComponentes = true;
          continue;
      }

      if (coletandoComponentes && /^\d{4}\.\d/.test(linha)) { // Exemplo: 2021.2
          let periodo = linha.split(/\s+/)[0]; // Pega apenas o primeiro período (ignora a duplicação)

          // Verifica se já coletamos dois semestres diferentes
          if (semestresColetados.size >= 2 && !semestresColetados.has(periodo)) {
              break; // Interrompe se já coletamos dois semestres diferentes
          }

          // Pula a linha duplicada do período
          if (linhas[i + 1] && /^\d{4}\.\d/.test(linhas[i + 1])) {
              i++; // Avança para a próxima linha
          }

          let componente = linhas[i + 1] || 'Não encontrado';
          let turma = linhas[i + 2] || 'Não encontrado';
          let situacao = linhas[i + 3] || 'Não encontrado';

          // Captura o código da matéria, frequência, nota e carga horária
          let codigo = 'Não encontrado', frequencia = 'Não encontrado', nota = 'Não encontrado', ch = 'Não encontrado';
          if (linhas[i + 4]) {
              const dados = linhas[i + 4].match(/([A-Z]{3}\d{4})(\d{1,3}\.\d{2})(\d{1,2}\.\d{1})(\d{2}\.\d{2})/);
              if (dados) {
                  codigo = dados[1].trim();
                  frequencia = dados[2].trim();
                  nota = dados[3].trim();
                  ch = dados[4].trim();
              }
          }

          // Captura docente
          let docente = 'Não encontrado';
          if (linhas[i + 5]?.includes('Docente(s):')) {
              docente = linhas[i + 5].replace('Docente(s):', '').trim();
          }

          componentes.push({ periodo, componente, turma, situacao, codigo, frequencia, nota, ch, docente });

          i += 5; // Avança para evitar repetições
          semestresColetados.add(periodo); // Adiciona o período ao Set
      }
  }

  data.componentes = componentes;
  return data;
  }
  
  module.exports = {
    extractDataFromText
  };