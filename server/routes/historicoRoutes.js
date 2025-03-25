const express = require('express');
const router = express.Router();
const historicoController = require('../controllers/historicoController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });


// Rotas
router.get('/', historicoController.listarHistoricos);
router.get('/:matricula', historicoController.buscarPorMatricula);
router.delete('/:matricula', historicoController.deletarHistorico);
router.get('/exportar-excel', historicoController.exportarExcel);
router.post('/upload', upload.array('pdfs'), historicoController.uploadHistorico);
  

module.exports = router;