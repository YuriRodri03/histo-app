const express = require('express');
const router = express.Router();
const historicoController = require('../controllers/historicoController');
const upload = require('../utils/multerConfig');

router.get('/', historicoController.listarHistoricos);
router.get('/:matricula', historicoController.buscarPorMatricula);
router.post('/upload', upload.array('pdfs', 50), historicoController.uploadHistorico);
router.delete('/:matricula', historicoController.deletarHistorico);
router.get('/exportar-excel', historicoController.exportarExcel);

module.exports = router;