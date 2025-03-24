const Historico = require('../models/Historico');
const Componente = require('../models/Componente');
const extractDataFromText = require('../utils/pdfParser');
const exportToExcel = require('../utils/excelExporter');
const pdfParse = require('pdf-parse'); // Adicione esta linha

exports.listarHistoricos = async (req, res, next) => {
  try {
    const historicos = await Historico.find();
    res.json(historicos);
  } catch (error) {
    next(error);
  }
};

exports.buscarPorMatricula = async (req, res, next) => {
  try {
    const historico = await Historico.findOne({ matricula: req.params.matricula });
    if (!historico) {
      return res.status(404).json({ message: 'Histórico não encontrado' });
    }
    res.json(historico);
  } catch (error) {
    next(error);
  }
};

exports.uploadHistorico = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }

    const resultados = [];
    
    for (const file of req.files) {
      // Extrai texto do PDF
      const data = await pdfParse(file.buffer);
      
      // Processa o texto extraído
      const extractedData = extractDataFromText(data.text);
      
      // Salva o histórico principal
      const novoHistorico = await Historico.create(extractedData);
      
      // Salva os componentes relacionados
      if (extractedData.componentes && extractedData.componentes.length > 0) {
        const componentes = extractedData.componentes.map(comp => ({
          ...comp,
          historico_matricula: novoHistorico.matricula
        }));
        await Componente.insertMany(componentes);
      }
      
      resultados.push(novoHistorico);
    }

    res.status(201).json(resultados);
  } catch (error) {
    console.error('Erro no upload:', error);
    next(error);
  }
};

exports.deletarHistorico = async (req, res, next) => {
  try {
    const matricula = req.params.matricula;
    
    await Historico.deleteOne({ matricula });
    await Componente.deleteMany({ historico_matricula: matricula });
    
    res.json({ message: 'Histórico e componentes deletados com sucesso' });
  } catch (error) {
    next(error);
  }
};

exports.exportarExcel = async (req, res, next) => {
  try {
    const historicos = await Historico.find().lean();
    const componentes = await Componente.find().lean();

    // Transforma os dados para o formato do Excel
    const dados = historicos.map(historico => {
      const comps = componentes.filter(c => c.historico_matricula === historico.matricula);
      return {
        ...historico,
        componentes: comps
      };
    });

    res.json(dados); // Ou implemente a lógica de exportação para Excel
  } catch (error) {
    next(error);
  }
};