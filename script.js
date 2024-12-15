document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const originalPreview = document.getElementById('originalPreview');
    const compressedPreview = document.getElementById('compressedPreview');
    const originalSize = document.getElementById('originalSize');
    const compressedSize = document.getElementById('compressedSize');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const downloadBtn = document.getElementById('downloadBtn');
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;

    let originalFiles = []; // 存储原始文件
    let compressedFiles = []; // 存储压缩后的文件
    const MAX_FILES = 10; // 最大文件数量限制

    // 检查本地存储中的主题设置
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);

    // 处理拖放上传
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#007AFF';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#DEDEDE';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#DEDEDE';
        const files = e.dataTransfer.files;
        if (files.length) handleFile(files);
    });

    // 处理点击上传
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files);
        }
    });

    // 修改处理文件函数
    function handleFile(files) {
        // 检查文件数量
        if (files.length > MAX_FILES) {
            alert(`最多只能上传${MAX_FILES}张图片`);
            return;
        }

        // 检查文件类型
        const validFiles = Array.from(files).filter(file => 
            file.type.match(/image\/(jpeg|png|svg\+xml)/i)
        );

        if (validFiles.length === 0) {
            alert('请上传JPG、PNG或SVG格式的图片！');
            return;
        }

        // 存储原始文件
        originalFiles = validFiles;
        
        // 显示图片列表区域和批量压缩按钮
        imageListsContainer.style.display = 'flex';
        batchCompressBtn.style.display = 'block';
        
        // 隐藏压缩后列表和压缩控制区域
        document.getElementById('compressedListContainer').style.display = 'none';
        document.getElementById('compressControls').style.display = 'none';  // 确保隐藏压缩控制区域

        // 显示原始图片列表
        displayOriginalList();
    }

    // 显示原始图片列表
    function displayOriginalList() {
        const originalList = document.getElementById('originalList');
        originalList.innerHTML = '';

        // 使用 Promise.all 确保按顺序加载
        const loadPromises = originalFiles.map((file, index) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const item = createImageListItem(file, file.size, e.target.result);
                    item.dataset.index = index;  // 添加索引标记
                    resolve(item);
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(loadPromises).then(items => {
            items.forEach(item => originalList.appendChild(item));
        });
    }

    // 创建图片列表项
    function createImageListItem(file, size, src) {
        const item = document.createElement('div');
        item.className = 'image-item';
        
        // 获取文件格式
        const format = file.type.split('/')[1].toUpperCase();
        
        item.innerHTML = `
            <img src="${src}" alt="${file.name}">
            <div class="image-info">
                <div class="image-name">${file.name}</div>
                <div class="image-meta">
                    <span>${formatFileSize(size)}</span>
                </div>
            </div>
        `;
        return item;
    }

    // 修改质量滑块控制
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = e.target.value + '%';
        // 使用防抖处理批量压缩
        debouncedBatchCompress();
    });

    // 添加批量压缩的防抖函数
    const debouncedBatchCompress = debounce(async () => {
        if (originalFiles.length === 0) return;
        
        const quality = qualitySlider.value / 100;
        compressedFiles = [];
        const compressedList = document.getElementById('compressedList');
        compressedList.innerHTML = '';

        try {
            // 按顺序处理每个文件
            for (let i = 0; i < originalFiles.length; i++) {
                const file = originalFiles[i];
                const compressedFile = await compressImage(file, quality);
                compressedFiles.push(compressedFile);
                
                const previewUrl = URL.createObjectURL(compressedFile);
                const item = createImageListItem(file, compressedFile.size, previewUrl);
                item.dataset.index = i;  // 添加索引标记
                compressedList.appendChild(item);
            }
        } catch (error) {
            console.error('压缩失败:', error);
            alert('压缩过程中出现错误，请重试');
        }
    }, 300);

    // 修改批量压缩按钮事件监听器
    document.getElementById('batchCompressBtn').addEventListener('click', () => {
        // 显示压缩后列表
        document.getElementById('compressedListContainer').style.display = 'block';
        // 显示压缩控制区域
        document.getElementById('compressControls').style.display = 'block';
        // 隐藏批量压缩按钮
        document.getElementById('batchCompressBtn').style.display = 'none';
        // 执行压缩
        debouncedBatchCompress();
    });

    // 修改压缩图片函数
    async function compressImage(file, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    let { width, height } = img;
                    let targetWidth = width;
                    let targetHeight = height;

                    // 只有在质量为1(100%)时才返回原始文件
                    if (quality === 1) {
                        resolve(file);
                        return;
                    }

                    // 调整压缩策略，确保0-99%都进行压缩
                    if (file.type === 'image/png') {
                        // PNG格式：调整缩放范围
                        const minScale = 0.3;  // 最小缩放比例30%
                        const maxScale = 0.9;  // 最大缩放比例90%，降低以确保不会超过原始大小
                        const scale = minScale + (quality * (maxScale - minScale));
                        
                        targetWidth = Math.round(width * scale);
                        targetHeight = Math.round(height * scale);
                        
                        canvas.width = targetWidth;
                        canvas.height = targetHeight;
                        
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                        
                        canvas.toBlob(
                            (blob) => {
                                if (blob) {
                                    // 如果压缩后大小超过原始大小，进行额外压缩
                                    if (blob.size >= file.size) {
                                        // 递归调用，使用较低的质量值
                                        const lowerQuality = quality * 0.9;
                                        compressImage(file, lowerQuality).then(resolve).catch(reject);
                                    } else {
                                        resolve(blob);
                                    }
                                } else {
                                    reject(new Error('压缩失败'));
                                }
                            },
                            'image/png'
                        );
                    } else if (file.type === 'image/jpeg') {
                        // JPEG格式：调整缩放范围
                        const scale = 0.7 + (quality * 0.2); // 调整尺寸范围：70%-90%
                        targetWidth = Math.round(width * scale);
                        targetHeight = Math.round(height * scale);
                        
                        canvas.width = targetWidth;
                        canvas.height = targetHeight;
                        
                        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                        
                        canvas.toBlob(
                            (blob) => {
                                if (blob) {
                                    // 如果压缩后大小超过原始大小，进行额外压缩
                                    if (blob.size >= file.size) {
                                        // 递归调用，使用较低的质量值
                                        const lowerQuality = quality * 0.9;
                                        compressImage(file, lowerQuality).then(resolve).catch(reject);
                                    } else {
                                        resolve(blob);
                                    }
                                } else {
                                    reject(new Error('压缩失败'));
                                }
                            },
                            'image/jpeg',
                            quality * 0.95  // 稍微降低JPEG的质量以确保压缩效果
                        );
                    } else if (file.type === 'image/svg+xml') {
                        // SVG格式：文本压缩
                        const text = e.target.result;
                        let compressedText = text;
                        
                        // 基础压缩
                        compressedText = text
                            .replace(/\s+/g, ' ')
                            .replace(/>\s+</g, '><')
                            .replace(/<!--[\s\S]*?-->/g, '')
                            .trim();

                        // 根据质量值进行更多压缩
                        if (quality < 0.8) {
                            compressedText = compressedText
                                .replace(/([0-9]+\.[0-9]{2})[0-9]*/g, '$1')
                                .replace(/([0-9]+)\.0+([^0-9])/g, '$1$2')
                                .replace(/\s+/g, '');
                        }

                        const blob = new Blob([compressedText], { type: 'image/svg+xml' });
                        resolve(blob);
                    }
                };
                img.onerror = () => reject(new Error('图片加载失败'));
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsDataURL(file);
        });
    }

    // 修改下载按钮功能
    downloadBtn.addEventListener('click', () => {
        if (compressedFiles.length === 0) {
            alert('请先压缩图片！');
            return;
        }

        // 创建zip文件
        const zip = new JSZip();
        compressedFiles.forEach((file, index) => {
            zip.file(`compressed_${originalFiles[index].name}`, file);
        });

        // 载zip文件
        zip.generateAsync({type: 'blob'}).then(content => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'compressed_images.zip';
            link.click();
        });
    });

    // 添加防抖函数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 文件大小格式化
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 主题切换功能
    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = {
        home: document.querySelector('.home-content'),
        compressor: document.querySelector('.compressor-content')
    };

    // 从 localStorage 获取上次访问的页面
    const lastVisitedPage = localStorage.getItem('currentPage') || 'home';

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // 移除所有导航项的激活状态
            navItems.forEach(nav => nav.classList.remove('active'));
            // 添加当前导航项的激活状态
            item.classList.add('active');

            // 隐藏所有内容
            Object.values(contentSections).forEach(section => section.style.display = 'none');
            // 显示当前选中的内容
            const target = item.getAttribute('data-target');
            if (contentSections[target]) {
                contentSections[target].style.display = 'block';
                // 保存当前页面到 localStorage
                localStorage.setItem('currentPage', target);
            }
        });

        // 如果是上次访问的页面，设置为激活状态
        if (item.getAttribute('data-target') === lastVisitedPage) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // 初始化显示上次访��的页面
    Object.values(contentSections).forEach(section => section.style.display = 'none');
    if (contentSections[lastVisitedPage]) {
        contentSections[lastVisitedPage].style.display = 'block';
    }

    // 添加在 DOMContentLoaded 事件监听器内
    const navToggle = document.getElementById('navToggle');
    const sidebar = document.querySelector('.sidebar');

    navToggle.addEventListener('click', () => {
        sidebar.classList.toggle('show');
        navToggle.classList.toggle('active');
    });

    // 点击内容区域时关闭导航
    document.querySelector('.content-background').addEventListener('click', () => {
        if (window.innerWidth <= 500) {
            sidebar.classList.remove('show');
            navToggle.classList.remove('active');
        }
    });

    // 点击导航项后自动关闭导航（在小屏幕时）
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 500) {
                sidebar.classList.remove('show');
                navToggle.classList.remove('active');
            }
        });
    });
}); 