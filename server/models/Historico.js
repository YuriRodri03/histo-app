const mongoose = require('mongoose');

const HistoricoSchema = new mongoose.Schema({
  matricula: { type: String, required: true, unique: true },
  nome: { type: String, required: true },
  dataNascimento: String,
  identidade: String,
  localNascimento: String,
  nomeMae: String,
  curso: String,
  municipioCurso: String,
  modalidade: String,
  iraIndividual: String,
  iraGeral: String,
  anoPeriodoInicial: String,
  previsaoConclusao: String,
  componentes: [{
    periodo: String,
    componente: String,
    turma: String,
    situacao: String,
    codigo: String,
    frequencia: String,
    nota: String,
    ch: String,
    docente: String
  }]
}, { 
  timestamps: true
});

module.exports = mongoose.model('Historico', HistoricoSchema);