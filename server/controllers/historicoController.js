const fs = require('fs').promises;
const path = require('path');
const Historico = require('../models/Historico');
const Componente = require('../models/Componente');
const pdfParse = require('pdf-parse');
const ExcelJS = require('exceljs');
const { extractDataFromText } = require('../utils/pdfParser');
/**
 * @desc    Lista todos os históricos
 * @route   GET /api/historicos
 * @access  Public
 */
exports.listarHistoricos = async (req, res, next) => {
  try {
    const historicos = await Historico.find()
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: historicos.length,
      data: historicos
    });
  } catch (error) {
    console.error('Erro ao listar históricos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar históricos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Busca histórico por matrícula
 * @route   GET /api/historicos/:matricula
 * @access  Public
 */
exports.buscarPorMatricula = async (req, res, next) => {
  try {
    const historico = await Historico.findOne({ matricula: req.params.matricula })
      .populate('componentes', '-_id -__v -historico_matricula');

    if (!historico) {
      return res.status(404).json({
        success: false,
        message: 'Histórico não encontrado'
      });
    }

    res.json({
      success: true,
      data: historico
    });
  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Faz upload e processa históricos em PDF
 * @route   POST /api/historicos/upload
 * @access  Public
 */
exports.uploadHistorico = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo PDF enviado'
      });
    }

    const resultados = [];
    const erros = [];
    const textosCompletos = [];

    for (const file of req.files) {
      try {
        if (!file.mimetype.includes('pdf')) {
          throw new Error('O arquivo não é um PDF válido');
        }

        // Extrai texto completo do PDF
        const data = await pdfParse(file.buffer);
        
        // Armazena texto completo para retorno
        textosCompletos.push({
          arquivo: file.originalname,
          textoCompleto: data.text,
          tamanho: data.text.length
        });

        // DEBUG: Mostra no console
        console.log(`\n===== TEXTO COMPLETO DE ${file.originalname} =====`);
        console.log(data.text);
        console.log('=============================================\n');

        if (!data.text || data.text.trim().length < 50) {
          throw new Error('PDF não contém texto suficiente ou está corrompido');
        }

        const extractedData = extractDataFromText(data.text);
        
        if (!extractedData.matricula) {
          throw new Error('Não foi possível extrair a matrícula do histórico');
        }

        const historicoExistente = await Historico.findOne({ 
          matricula: extractedData.matricula 
        });

        if (historicoExistente) {
          throw new Error(`Histórico com matrícula ${extractedData.matricula} já existe`);
        }

        const novoHistorico = await Historico.create(extractedData);

        if (extractedData.componentes && extractedData.componentes.length > 0) {
          const componentesParaSalvar = extractedData.componentes.map(comp => ({
            ...comp,
            historico_matricula: novoHistorico.matricula
          }));

          await Componente.insertMany(componentesParaSalvar);
        }

        resultados.push({
          matricula: novoHistorico.matricula,
          nome: novoHistorico.nome,
          curso: novoHistorico.curso,
          arquivo: file.originalname,
          componentes: extractedData.componentes?.length || 0
        });

      } catch (fileError) {
        console.error(`Erro no arquivo ${file?.originalname}:`, fileError);
        erros.push({
          arquivo: file?.originalname || 'Desconhecido',
          error: fileError.message
        });
      }
    }

    const response = {
      success: erros.length === 0,
      message: `Processamento completo. ${resultados.length} sucesso(s), ${erros.length} erro(s)`,
      resultados,
      erros,
      textosCompletos: process.env.NODE_ENV === 'development' ? textosCompletos : undefined
    };

    const statusCode = resultados.length > 0 && erros.length > 0 ? 207 : 
                     resultados.length > 0 ? 201 : 400;

    res.status(statusCode).json(response);

  } catch (error) {
    console.error('Erro geral no upload:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno no processamento de históricos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Deleta um histórico por matrícula
 * @route   DELETE /api/historicos/:matricula
 * @access  Public
 */
exports.deletarHistorico = async (req, res, next) => {
  try {
    const matricula = req.params.matricula;

    const historico = await Historico.findOne({ matricula });
    if (!historico) {
      return res.status(404).json({
        success: false,
        message: 'Histórico não encontrado'
      });
    }

    await Componente.deleteMany({ historico_matricula: matricula });
    await Historico.deleteOne({ matricula });

    res.json({
      success: true,
      message: 'Histórico e componentes associados deletados com sucesso',
      data: {
        matricula,
        nome: historico.nome
      }
    });
  } catch (error) {
    console.error('Erro ao deletar histórico:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar histórico',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Exporta dados para Excel
 * @route   GET /api/historicos/exportar-excel
 * @access  Public
 */
exports.exportarExcel = async (req, res) => {
  try {
    // 1. Verifica se existem históricos
    const historicos = await Historico.find().lean();
    
    if (!historicos || historicos.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum histórico encontrado para exportação'
      });
    }

    // 2. Cria a planilha
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Históricos Acadêmicos');

    // 3. Cabeçalhos
    worksheet.columns = [
      { header: 'Matrícula', key: 'matricula', width: 15 },
      { header: 'Nome', key: 'nome', width: 30 },
      { header: 'Curso', key: 'curso', width: 40 },
      { header: 'IRA Individual', key: 'iraIndividual', width: 15 },
      { header: 'IRA Geral', key: 'iraGeral', width: 15 }
    ];

    // 4. Adiciona dados
    historicos.forEach(historico => {
      worksheet.addRow({
        matricula: historico.matricula,
        nome: historico.nome,
        curso: historico.curso,
        iraIndividual: historico.iraIndividual,
        iraGeral: historico.iraGeral
      });
    });

    // 5. Configura os headers corretamente
    res.setHeader('Content-Type', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 
      'attachment; filename=historicos_academicos.xlsx');

    // 6. Envia o arquivo
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Erro na exportação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar arquivo Excel',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};