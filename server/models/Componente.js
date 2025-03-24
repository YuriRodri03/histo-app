const mongoose = require('mongoose');

const ComponenteSchema = new mongoose.Schema({
  historico_matricula: { type: String, required: true },
  periodo: String,
  componente: String,
  turma: String,
  situacao: String,
  codigo: String,
  frequencia: String,
  nota: String,
  ch: String,
  docente: String
});

module.exports = mongoose.model('Componente', ComponenteSchema);