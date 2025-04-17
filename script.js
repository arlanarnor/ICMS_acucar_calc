function showSelectedFile() {
    const fileInput = document.getElementById('fileInput');
    const selectedFile = document.getElementById('selectedFile');
    if (fileInput.files.length > 0) {
        selectedFile.textContent = `Empresa: `;
        const reader = new FileReader();
        reader.onload = function(e) {
            const firstLine = e.target.result.split('\n')[0];
            const contentBetweenBars = firstLine.split('|')[6];
            if (contentBetweenBars) {
                selectedFile.textContent += `${contentBetweenBars}`;
            }
        };
        reader.readAsText(fileInput.files[0]);
    } else {
        selectedFile.textContent = '';
    }
}

function processFile() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) {
        alert('Por favor, selecione um arquivo antes de processar.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const lines = e.target.result.split('\n');
        const filteredC170Lines = [];
        const productCodes = [];
        
        // Primeiro, identificar todos os códigos de produtos relacionados ao açúcar
        lines.forEach(line => {
            if (line.startsWith('|0200|')) {
                const parts = line.split('|');
                const productCode = parts[2];
                const description = parts[3].toLowerCase();
                if (description.includes('açucar') || description.includes('acucar') || 
                    description.includes('acúcar') || description.includes('açúcar')) {
                    productCodes.push(productCode);
                }
            }
        });
        
        // Depois, filtrar as linhas C170 com esses códigos de produtos
        lines.forEach(line => {
            if (line.startsWith('|C170|')) {
                const parts = line.split('|');
                const productCode = parts[3];
                const description = productCodes.includes(productCode) ? getDescriptionFrom0200(productCode, lines) : '';
                const notaNumber = getNotaNumber(line, lines);
                let isDisabled = false;
                let isSpecial = false;
                
                if (productCodes.includes(productCode)) {
                    if (parts[11].startsWith('2')) {
                        isDisabled = true;
                    }
                    if (parts[11] === '1152' || parts[11] === '1409') {
                        isSpecial = true;
                    }
                    filteredC170Lines.push({ line, description, notaNumber, isDisabled, isSpecial });
                }
            }
        });
        
        updateTable(filteredC170Lines);
        
        // Mostrar uma notificação de sucesso
        if (filteredC170Lines.length > 0) {
            const notification = document.createElement('div');
            notification.className = 'notificacao';
            notification.textContent = `Processado com sucesso! Encontrados ${filteredC170Lines.length} itens relacionados ao açúcar.`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 500);
            }, 3000);
        } else {
            alert('Nenhum item relacionado ao açúcar foi encontrado no arquivo.');
        }
    };
    
    reader.readAsText(fileInput.files[0]);
}

function getDescriptionFrom0200(productCode, lines) {
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('|0200|')) {
            const parts = lines[i].split('|');
            if (parts[2] === productCode) {
                return parts[3].toLowerCase();
            }
        }
    }
    return '';
}

function getNotaNumber(c170Line, lines) {
    let index = lines.indexOf(c170Line);
    while (index >= 0) {
        if (lines[index].startsWith('|C100|')) {
            const parts = lines[index].split('|');
            return parts[8];
        }
        index--;
    }
    return '';
}

function updateTable(lines) {
    const tableBody = document.getElementById('resultsTable').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Limpa a tabela antes de adicionar novas linhas
    
    if (lines.length === 0) {
        const emptyRow = tableBody.insertRow();
        const emptyCell = emptyRow.insertCell(0);
        emptyCell.colSpan = 5;
        emptyCell.textContent = 'Nenhum item relacionado ao açúcar foi encontrado.';
        emptyCell.style.textAlign = 'center';
        emptyCell.style.padding = '40px';
        return;
    }
    
    lines.forEach((entry, index) => {
        const parts = entry.line.split('|');
        const descricao = entry.description;
        const valor = parseFloat(parts[7]);
        const imposto = valor * 0.019; // 1,9% do valor
        
        const row = tableBody.insertRow();
        row.insertCell(0).textContent = entry.notaNumber;
        
        const selectCell = row.insertCell(1);
        if (entry.isDisabled) {
            selectCell.innerHTML = `<input type="checkbox" name="selectRow" value="${imposto.toFixed(4)}" disabled>`;
            row.className = 'disabled-row';
        } else {
            selectCell.innerHTML = `<input type="checkbox" name="selectRow" value="${imposto.toFixed(4)}">`;
        }
        
        row.insertCell(2).textContent = descricao;
        row.insertCell(3).textContent = formatarMoeda(valor);
        row.insertCell(4).textContent = formatarMoeda(imposto);
        
        if (entry.isSpecial) {
            row.className = 'special-row';
        }
    });
    
    // Adicionar ouvintes de evento para checkboxes
    adicionarListenersCheckboxes();
}

function formatarMoeda(value) {
    return value.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
    });
}

function adicionarListenersCheckboxes() {
    const checkboxes = document.querySelectorAll('input[name="selectRow"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            calculateSelected();
        });
    });
}

function calculateSelected() {
    const selectedCheckboxes = document.querySelectorAll('input[name="selectRow"]:checked');
    let totalSelecionado = 0;
    
    selectedCheckboxes.forEach(checkbox => {
        totalSelecionado += parseFloat(checkbox.value);
    });
    
    document.getElementById('totalSelecionado').textContent = 'Total Selecionado: ' + 
        totalSelecionado.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
    // Adicionar animação ao total quando for atualizado
    const totalElement = document.getElementById('totalSelecionado');
    totalElement.classList.add('destaque');
    
    setTimeout(() => {
        totalElement.classList.remove('destaque');
    }, 500);
}

// Adicionar CSS para notificação e animação de destaque
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .notificacao {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #32d74b;
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            opacity: 1;
            transition: opacity 0.5s ease;
        }
        
        .destaque {
            animation: destaque 0.5s ease;
        }
        
        @keyframes destaque {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
    `;
    document.head.appendChild(style);
});
