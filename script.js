document.getElementById('searchForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const query = document.getElementById('searchQuery').value.trim();
    if (query === "") {
        displayResults([]);
    } else {
        search(query);
    }
});

document.getElementById('languageSelector').addEventListener('change', function () {
    setLanguage(this.value);
});

let currentLanguage = 'en'; // Bahasa default

const data = {
    en: [
        { title: 'Numini', url: 'index.html' },
        { title: 'HTML basics', url: 'https://example.com/html-basics' },
        { title: 'CSS styling guide', url: 'https://example.com/css-styling-guide' },
        { title: 'Java programming', url: 'https://example.com/java-programming' },
        { title: 'Building a website', url: 'https://example.com/building-a-website' },
        { title: 'Frontend development', url: 'https://example.com/frontend-development' },
        { title: 'Backend development', url: 'https://example.com/backend-development' },
        { title: 'Fullstack guide', url: 'https://example.com/fullstack-guide' }
    ],
    id: [
        { title: 'Numini', url: 'index.html' },
        { title: 'Dasar-dasar HTML', url: 'https://example.com/html-basics' },
        { title: 'Panduan Gaya CSS', url: 'https://example.com/css-styling-guide' },
        { title: 'Pemrograman Java', url: 'https://example.com/java-programming' },
        { title: 'Membangun Situs Web', url: 'https://example.com/building-a-website' },
        { title: 'Pengembangan Frontend', url: 'https://example.com/frontend-development' },
        { title: 'Pengembangan Backend', url: 'https://example.com/backend-development' },
        { title: 'Panduan Fullstack', url: 'https://example.com/fullstack-guide' }
    ],
    zh: [
        { title: '努米尼', url: 'index.html' },
        { title: 'HTML基础', url: 'https://example.com/html-basics' },
        { title: 'CSS样式指南', url: 'https://example.com/css-styling-guide' },
        { title: 'Java编程', url: 'https://example.com/java-programming' },
        { title: '创建网站', url: 'https://example.com/building-a-website' },
        { title: '前端开发', url: 'https://example.com/frontend-development' },
        { title: '后端开发', url: 'https://example.com/backend-development' },
        { title: '全栈指南', url: 'https://example.com/fullstack-guide' }
    ],
    es: [
        { title: 'Numini', url: 'index.html' },
        { title: 'Conceptos básicos de HTML', url: 'https://example.com/html-basics' },
        { title: 'Guía de estilo CSS', url: 'https://example.com/css-styling-guide' },
        { title: 'Programación en Java', url: 'https://example.com/java-programming' },
        { title: 'Construcción de un sitio web', url: 'https://example.com/building-a-website' },
        { title: 'Desarrollo frontend', url: 'https://example.com/frontend-development' },
        { title: 'Desarrollo backend', url: 'https://example.com/backend-development' },
        { title: 'Guía de fullstack', url: 'https://example.com/fullstack-guide' }
    ]
};

function search(query) {
    const results = data[currentLanguage].filter(item => item.title.toLowerCase().includes(query.toLowerCase()));
    displayResults(results);
}

function displayResults(results) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = ''; // Hapus hasil sebelumnya
    if (results.length > 0) {
        results.forEach(result => {
            const div = document.createElement('div');
            div.classList.add('result-item');
            const link = document.createElement('a');
            link.href = result.url;
            link.textContent = result.title;
            link.target = '_blank'; // Buka link di tab baru
            div.appendChild(link);
            resultsContainer.appendChild(div);
        });
    } else {
        const notFoundDiv = document.createElement('div');
        notFoundDiv.classList.add('not-found');
        notFoundDiv.textContent = getNotFoundText();
        resultsContainer.appendChild(notFoundDiv);
    }
}

function setLanguage(language) {
    currentLanguage = language;
    document.getElementById('searchQuery').placeholder = getPlaceholderText();
    document.getElementById('languageLabel').textContent = getSelectLanguageText();
    document.querySelector('button[type="submit"]').textContent = getSearchButtonText();
    document.getElementById('results').innerHTML = ''; // Bersihkan hasil pencarian saat mengubah bahasa
}

function getPlaceholderText() {
    switch (currentLanguage) {
        case 'id': return 'Masukkan kata pencarian...';
        case 'zh': return '输入搜索词...';
        case 'es': return 'Introduzca el término de búsqueda...';
        default: return 'Enter search term...';
    }
}

function getSelectLanguageText() {
    switch (currentLanguage) {
        case 'id': return 'Pilih Bahasa:';
        case 'zh': return '选择语言:';
        case 'es': return 'Seleccionar idioma:';
        default: return 'Select Language:';
    }
}

function getSearchButtonText() {
    switch (currentLanguage) {
        case 'id': return 'Cari';
        case 'zh': return '搜索';
        case 'es': return 'Buscar';
        default: return 'Search';
    }
}

function getNotFoundText() {
    switch (currentLanguage) {
        case 'id': return 'Tidak Ditemukan';
        case 'zh': return '未找到';
        case 'es': return 'No Encontrado';
        default: return 'Not Found';
    }
}

// Inisialisasi label bahasa saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('languageLabel').textContent = getSelectLanguageText();
});