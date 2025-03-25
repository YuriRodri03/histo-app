import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const api = axios.create({
  baseURL: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5000/api'
    : 'https://histo-app.onrender.com/api',
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  }
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ECONNABORTED') {
      error.message = 'Tempo de conexão esgotado. Verifique sua internet.';
    }
    return Promise.reject(error);
  }
);

const App = () => {
    const [file, setFile] = useState(null);
    const [data, setData] = useState(null);
    const [historicos, setHistoricos] = useState([]);
    const [matriculaBusca, setMatriculaBusca] = useState('');
    const [historicoBusca, setHistoricoBusca] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        const selectedFiles = e.target.files;
        if (selectedFiles && selectedFiles.length > 0) {
            setFile(selectedFiles);
            setError(null);
        } else {
            setError('Por favor, selecione pelo menos um arquivo');
        }
    };

    const fetchHistoricos = async () => {
        try {
            setLoading(true);
            const response = await api.get('/historicos');
            
            const dados = Array.isArray(response.data?.data) 
                ? response.data.data 
                : Array.isArray(response.data)
                    ? response.data
                    : [];
            
            setHistoricos(dados);
            setError(null);
        } catch (error) {
            console.error('Erro ao buscar históricos:', error);
            setError(error.response?.data?.message || 'Erro ao carregar históricos');
            setHistoricos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistoricos();
    }, []);

    const buscarHistoricoPorMatricula = async () => {
        if (!matriculaBusca.trim()) {
            setError('Digite uma matrícula para buscar');
            return;
        }

        try {
            setLoading(true);
            const response = await api.get(`/historicos/${matriculaBusca}`);
            setHistoricoBusca(response.data.data || response.data);
            setError(null);
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            setError('Histórico não encontrado');
            setHistoricoBusca(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!file || file.length === 0) {
            setError('Selecione pelo menos um arquivo PDF antes de enviar.');
            return;
        }

        const formData = new FormData();
        Array.from(file).forEach((f) => {  
            formData.append('pdfs', f); 
          });

        try {
            setLoading(true);
            const response = await api.post('/historicos/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setData(response.data);
            await fetchHistoricos();
            setError(null);
        } catch (error) {
            console.error('Erro detalhado ao enviar arquivos:', {
                error: error.response?.data || error.message,
                status: error.response?.status
            });
            setError(error.response?.data?.message || 'Erro ao enviar arquivos. Verifique o formato.');
        } finally {
            setLoading(false);
        }
    };

    const deletarHistorico = async (matricula) => {
        if (!window.confirm(`Tem certeza que deseja deletar o histórico da matrícula ${matricula}?`)) {
            return;
        }

        try {
            setLoading(true);
            await api.delete(`/historicos/${matricula}`);
            await fetchHistoricos();
            setError(null);
        } catch (error) {
            console.error('Erro ao deletar histórico:', error);
            setError(error.response?.data?.message || 'Erro ao deletar histórico');
        } finally {
            setLoading(false);
        }
    };

    const exportarParaExcel = async () => {
        try {
            setLoading(true);
            const response = await api.get('/historicos/exportar-excel', {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'historicos.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Erro ao exportar para Excel:', error);
            setError(error.response?.data?.message || 'Erro ao exportar para Excel');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="App">
            <header className="app-header">
                <h1>Upload de Históricos Universitários</h1>
            </header>
            
            {error && <div className="error-message">{error}</div>}
            {loading && <div className="loading-indicator">Carregando...</div>}

            <main className="app-content">
                <section className="upload-section card">
                    <h2>Enviar Históricos</h2>
                    <form onSubmit={handleSubmit} className="upload-form">
                        <div className="file-input-container">
                            <input 
                                type="file" 
                                onChange={handleFileChange} 
                                multiple 
                                accept=".pdf" 
                                id="file-upload"
                                className="file-input"
                            />
                            <label htmlFor="file-upload" className="file-upload-label">
                                {file ? `${file.length} arquivo(s) selecionado(s)` : 'Selecionar PDF(s)'}
                            </label>
                        </div>
                        <button 
                            type="submit" 
                            className="primary-button"
                            disabled={loading || !file}
                        >
                            {loading ? 'Enviando...' : 'Enviar PDFs'}
                        </button>
                    </form>
                </section>

                {data && (
                    <section className="results-section card">
                        <h2>Dados Extraídos</h2>
                        <div className="extracted-results">
                            {data.resultados.map((resultado, index) => (
                                <div key={index} className="result-card">
                                    <h3>{resultado.nome}</h3>
                                    <div className="result-details">
                                        <div className="detail-row">
                                            <span className="detail-label">Matrícula:</span>
                                            <span className="detail-value">{resultado.matricula}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Curso:</span>
                                            <span className="detail-value">{resultado.curso || 'Não informado'}</span>
                                        </div>
                                        <div className="detail-row">
                                            <span className="detail-label">Arquivo:</span>
                                            <span className="detail-value">{resultado.arquivo}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section className="search-section card">
                    <h2>Buscar Histórico</h2>
                    <div className="search-controls">
                        <input
                            type="text"
                            value={matriculaBusca}
                            onChange={(e) => setMatriculaBusca(e.target.value)}
                            placeholder="Digite a matrícula"
                            className="search-input"
                        />
                        <button 
                            onClick={buscarHistoricoPorMatricula} 
                            className="primary-button"
                            disabled={loading}
                        >
                            Buscar
                        </button>
                    </div>
                    {historicoBusca && (
                        <div className="search-result">
                            <h3>Resultado da Busca</h3>
                            <div className="result-card">
                                <h4>{historicoBusca.nome}</h4>
                                <div className="result-details">
                                    <div className="detail-row">
                                        <span className="detail-label">Matrícula:</span>
                                        <span className="detail-value">{historicoBusca.matricula}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Curso:</span>
                                        <span className="detail-value">{historicoBusca.curso || 'Não informado'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                <section className="historicos-section card">
                    <div className="section-header">
                        <h2>Históricos Cadastrados</h2>
                        <button 
                            onClick={exportarParaExcel} 
                            className="secondary-button"
                            disabled={loading || historicos.length === 0}
                        >
                            Exportar para Excel
                        </button>
                    </div>
                    
                    <div className="historicos-grid">
                        {Array.isArray(historicos) && historicos.length > 0 ? (
                            historicos.map((historico) => (
                                <div key={historico._id || historico.matricula} className="historico-card">
                                    <div className="card-header">
                                        <h3>{historico.nome}</h3>
                                        <span className="matricula-badge">{historico.matricula}</span>
                                    </div>
                                    <div className="card-body">
                                        <p className="curso-info">{historico.curso || 'Curso não especificado'}</p>
                                    </div>
                                    <div className="card-footer">
                                        <button 
                                            onClick={() => deletarHistorico(historico.matricula)}
                                            className="danger-button"
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-results">
                                Nenhum histórico cadastrado
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default App;