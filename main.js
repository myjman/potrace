// main.js
import { init, potrace } from './node_modules/esm-potrace-wasm/dist/index.js';

// 전역 상태
let selectedFile = null;
let svgString = '';

// WASM 초기화
(async () => {
  try {
    await init();
    console.log('Potrace WASM initialized');
  } catch (err) {
    console.error('Failed to init WASM:', err);
    alert('WASM init error');
  }
})();

// DOM 요소
const dropzone          = document.getElementById('dropzone');
const fileInput         = document.getElementById('fileInput');
const chooseBtn         = document.getElementById('chooseBtn');
const startConversionBtn= document.getElementById('startConversionBtn');
const downloadBtn       = document.getElementById('downloadBtn');
const progressContainer = document.getElementById('progressContainer');
const progressBar       = document.getElementById('progressBar');
const progressText      = document.getElementById('progressText');
const attachmentMessage = document.getElementById('attachmentMessage');

/** 파일 -> Blob */
function fileToBlob(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(new Blob([reader.result], { type: file.type }));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/** 5초 progress 시뮬레이션 */
function simulateProgress(seconds) {
  return new Promise((resolve) => {
    const totalSteps = 50;
    let currentStep = 0;
    const intervalMs = (seconds * 1000) / totalSteps;

    const timer = setInterval(() => {
      currentStep++;
      const percent = Math.floor((currentStep / totalSteps) * 100);
      progressBar.style.width = percent + '%';
      progressText.textContent = percent + '%';
      if (currentStep >= totalSteps) {
        clearInterval(timer);
        resolve();
      }
    }, intervalMs);
  });
}

/** 이벤트 핸들러: Choose Files */
chooseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

/** 드롭존 클릭 */
dropzone.addEventListener('click', () => {
  fileInput.click();
});

/** 드래그 & 드롭 */
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
});

/** file input change */
fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

/** 파일 처리 로직 */
function handleFiles(files) {
  if (!files || files.length === 0) return;
  selectedFile = files[0];
  console.log('Selected file:', selectedFile.name, selectedFile.size, 'bytes');

  // 메시지: "File attached successfully!"
  attachmentMessage.textContent = 'File attached successfully!';

  // 변환 버튼 활성화, 다운로드 비활성
  startConversionBtn.disabled = false;
  downloadBtn.disabled = true;

  // 진행률 숨김
  progressContainer.style.display = 'none';
  progressBar.style.width = '0%';
  progressText.textContent = '0%';
}

/** 변환 버튼 클릭 */
startConversionBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    alert('Please choose a file first.');
    return;
  }

  try {
    // 로딩 UI
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = '0%';

    // 5초 진행률 시뮬레이션
    await simulateProgress(5);

    // Potrace 변환
    const bitmap = await createImageBitmap(await fileToBlob(selectedFile));
    const options = {
      turdsize: 2, turnpolicy: 4, alphamax: 1, opticurve: 1,
      opttolerance: 0.2, pathonly: false, extractcolors: true,
      posterizelevel: 2, posterizationalgorithm: 0
    };
    svgString = await potrace(bitmap, options);

    // 진행률 100%
    progressBar.style.width = '100%';
    progressText.textContent = '100%';

    // 메시지: "File conversion completed!"
    attachmentMessage.textContent = 'File conversion completed!';

    // 다운로드 활성
    downloadBtn.disabled = false;

  } catch (error) {
    console.error('Conversion error:', error);
    // 오류 시 알림 + 새로고침
    alert('An error occurred during conversion.');
    location.reload();
  }
});

/** 다운로드 버튼 클릭 */
downloadBtn.addEventListener('click', () => {
  if (!svgString) {
    alert('No SVG data to download.');
    return;
  }

  // 다운로드
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'converted.svg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // "File downloaded successfully!" 
  // (사용자가 확인할 새로고침 직전 순간에 메시지를 바꿈)
  attachmentMessage.textContent = 'File downloaded successfully!';

  // 페이지 즉시 새로고침
  location.reload();
});
