import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const api = axios.create({
  baseURL:'https://histo-app.onrender.com/api',
  timeout: 10000,
});

const App = () => {
    const [file, setFile] = useState(null);
    const [data, setData] = useState(null);
    const [historicos, setHistoricos] = useState([]);
    const [matriculaBusca, setMatriculaBusca] = useState('');
    const [historicoBusca, setHistoricoBusca] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchHistoricos = async () => {
        try {
            setLoading(true);
            const response = await api.get('/historicos');
            setHistoricos(response.data);
            setError(null);
        } catch (error) {
            console.error('Erro ao buscar históricos:', error);
            setError('Erro ao carregar históricos. Tente novamente.');
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
            setHistoricoBusca(response.data);
            setError(null);
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            setError('Histórico não encontrado');
            setHistoricoBusca(null);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files);
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!file || file.length === 0) {
            setError('Selecione pelo menos um arquivo PDF antes de enviar.');
            return;
        }

        const formData = new FormData();
        for (let i = 0; i < file.length; i++) {
            formData.append('pdfs', file[i]);
        }

        try {
            setLoading(true);
            const response = await api.post('/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setData(response.data);
            await fetchHistoricos();
            setError(null);
        } catch (error) {
            console.error('Erro ao enviar os arquivos', error);
            setError('Erro ao enviar arquivos. Verifique o formato.');
        } finally {
            setLoading(false);
        }
    };

    const deletarHistorico = async (matricula) => {
        if (!window.confirm('Tem certeza que deseja deletar este histórico?')) {
            return;
        }

        try {
            setLoading(true);
            await api.delete(`/historicos/${matricula}`);
            alert('Histórico deletado com sucesso!');
            await fetchHistoricos();
        } catch (error) {
            console.error('Erro ao deletar histórico:', error);
            alert('Erro ao deletar histórico.');
        } finally {
            setLoading(false);
        }
    };

    const exportarParaExcel = async () => {
        try {
            setLoading(true);
            const response = await api.get('/exportar-excel', {
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
            setError('Erro ao exportar para Excel');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="App">
            <h1>Upload de Históricos Universitários</h1>
            
            {error && <div className="error-message">{error}</div>}
            {loading && <div className="loading-indicator">Carregando...</div>}

            <div className="upload-section">
                <h2>Enviar Históricos</h2>
                <form onSubmit={handleSubmit}>
                    <input 
                        type="file" 
                        onChange={handleFileChange} 
                        multiple 
                        accept=".pdf" 
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Enviando...' : 'Enviar PDFs'}
                    </button>
                </form>
            </div>

            {data && (
                <div className="data-section">
                    <h2>Dados Extraídos</h2>
                    <pre>{JSON.stringify(data, null, 2)}</pre>
                </div>
            )}

            <div className="search-section">
                <h2>Buscar Histórico</h2>
                <div className="search-controls">
                    <input
                        type="text"
                        value={matriculaBusca}
                        onChange={(e) => setMatriculaBusca(e.target.value)}
                        placeholder="Digite a matrícula"
                    />
                    <button onClick={buscarHistoricoPorMatricula} disabled={loading}>
                        Buscar
                    </button>
                </div>
                {historicoBusca && (
                    <div className="search-results">
                        <h3>Resultado:</h3>
                        <p>Nome: {historicoBusca.nome}</p>
                        <p>Matrícula: {historicoBusca.matricula}</p>
                    </div>
                )}
            </div>

            <div className="historicos-section">
                <h2>Históricos Cadastrados</h2>
                <button onClick={exportarParaExcel} className="export-button">
                    Exportar para Excel
                </button>
                <ul className="historicos-list">
                    {historicos.map((historico, index) => (
                        <li key={index}>
                            <div className="historico-info">
                                <span>{historico.nome}</span>
                                <span>Matrícula: {historico.matricula}</span>
                            </div>
                            <button 
                                onClick={() => deletarHistorico(historico.matricula)}
                                className="delete-button"
                            >
                                Excluir
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default App;