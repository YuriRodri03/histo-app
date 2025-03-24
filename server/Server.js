require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Inicialize o app Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: ['http://localhost:5001', 'https://yurirodri03.github.io'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());

// 5. Conexão com MongoDB (com validação de URL)
const connectDB = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não definida no .env');
    }
    
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado ao MongoDB');
  } catch (err) {
    console.error('❌ Erro na conexão com MongoDB:', err.message);
    console.log('DATABASE_URL usada:', process.env.DATABASE_URL);
    process.exit(1);
  }
};

// 6. Rotas
const historicoRoutes = require('./routes/historicoRoutes');
app.use('/api/historicos', historicoRoutes);

// 7. Servir frontend em produção
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// 8. Error handling (certifique-se de ter este middleware)
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);

// 9. Iniciar servidor
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
  });
};

startServer();