/**
 * Performance Analyzer - Dastur performance'ini tahlil qilish
 * Qaysi fayllar ko'p vaqt olayotganini aniqlash
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class PerformanceAnalyzer {
  constructor() {
    this.results = [];
    this.startTime = performance.now();
  }

  /**
   * Fayl o'lchamini tekshirish
   */
  analyzeFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      
      return {
        path: filePath,
        size: stats.size,
        lines: content.split('\n').length,
        characters: content.length,
        functions: (content.match(/function|const.*=.*\(|class.*{/g) || []).length,
        imports: (content.match(/require\(|import.*from/g) || []).length,
        complexity: this.calculateComplexity(content)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Kod complexity'sini hisoblash
   */
  calculateComplexity(content) {
    const complexityIndicators = [
      content.match(/if\s*\(/g) || [],
      content.match(/for\s*\(/g) || [],
      content.match(/while\s*\(/g) || [],
      content.match(/switch\s*\(/g) || [],
      content.match(/catch\s*\(/g) || [],
      content.match(/async\s+/g) || [],
      content.match(/await\s+/g) || []
    ];

    return complexityIndicators.reduce((total, arr) => total + arr.length, 0);
  }

  /**
   * Barcha JavaScript fayllarini tahlil qilish
   */
  analyzeDirectory(dirPath, results = []) {
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          this.analyzeDirectory(fullPath, results);
        } else if (item.endsWith('.js') && !item.includes('.test.') && !item.includes('.backup')) {
          const analysis = this.analyzeFileSize(fullPath);
          if (analysis) {
            results.push(analysis);
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error(`Error analyzing ${dirPath}:`, error.message);
      return results;
    }
  }

  /**
   * Eng og'ir fayllarni topish
   */
  findHeaviestFiles(limit = 20) {
    return this.results
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, limit);
  }

  /**
   * Eng uzun fayllarni topish
   */
  findLongestFiles(limit = 20) {
    return this.results
      .sort((a, b) => b.lines - a.lines)
      .slice(0, limit);
  }

  /**
   * Eng katta fayllarni topish
   */
  findLargestFiles(limit = 20) {
    return this.results
      .sort((a, b) => b.size - a.size)
      .slice(0, limit);
  }

  /**
   * Eng ko'p function'ga ega fayllarni topish
   */
  findMostComplexFiles(limit = 20) {
    return this.results
      .sort((a, b) => b.functions - a.functions)
      .slice(0, limit);
  }

  /**
   * Performance tavsiyalari
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Eng og'ir fayllar
    const heaviest = this.findHeaviestFiles(5);
    if (heaviest.length > 0) {
      recommendations.push({
        type: 'HIGH_COMPLEXITY',
        message: 'Eng og\'ir fayllar (complexity > 50):',
        files: heaviest.map(f => `${f.path} (${f.complexity} complexity, ${f.lines} lines)`)
      });
    }

    // Eng uzun fayllar
    const longest = this.findLongestFiles(5);
    if (longest.length > 0) {
      recommendations.push({
        type: 'LONG_FILES',
        message: 'Eng uzun fayllar (>300 qator):',
        files: longest.map(f => `${f.path} (${f.lines} lines)`)
      });
    }

    // Eng ko'p function'ga ega fayllar
    const mostFunctions = this.findMostComplexFiles(5);
    if (mostFunctions.length > 0) {
      recommendations.push({
        type: 'TOO_MANY_FUNCTIONS',
        message: 'Eng ko\'p function\'ga ega fayllar (>20 function):',
        files: mostFunctions.map(f => `${f.path} (${f.functions} functions)`)
      });
    }

    return recommendations;
  }

  /**
   * Natijalarni console'ga chiqarish
   */
  printResults() {
    console.log('🔍 PERFORMANCE ANALYSIS RESULTS');
    console.log('================================\n');

    // Umumiy statistika
    const totalFiles = this.results.length;
    const totalLines = this.results.reduce((sum, f) => sum + f.lines, 0);
    const totalSize = this.results.reduce((sum, f) => sum + f.size, 0);
    const avgComplexity = this.results.reduce((sum, f) => sum + f.complexity, 0) / totalFiles;

    console.log('📊 UMUMIY STATISTIKA:');
    console.log(`   Fayllar soni: ${totalFiles}`);
    console.log(`   Jami qatorlar: ${totalLines.toLocaleString()}`);
    console.log(`   Jami hajm: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`   O'rtacha complexity: ${avgComplexity.toFixed(2)}\n`);

    // Eng og'ir fayllar
    console.log('🔥 ENG OG\'IR FAYLLAR (Complexity bo\'yicha):');
    const heaviest = this.findHeaviestFiles(10);
    heaviest.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.path}`);
      console.log(`      Complexity: ${file.complexity}, Qatorlar: ${file.lines}, Function'lar: ${file.functions}`);
    });

    console.log('\n📏 ENG UZUN FAYLLAR:');
    const longest = this.findLongestFiles(10);
    longest.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.path} - ${file.lines} qator`);
    });

    console.log('\n⚙️ ENG KO\'P FUNCTION\'GA EGA FAYLLAR:');
    const mostFunctions = this.findMostComplexFiles(10);
    mostFunctions.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file.path} - ${file.functions} function`);
    });

    // Tavsiyalar
    console.log('\n💡 TAVSIYALAR:');
    const recommendations = this.generateRecommendations();
    recommendations.forEach((rec, index) => {
      console.log(`\n   ${index + 1}. ${rec.type}:`);
      console.log(`      ${rec.message}`);
      rec.files.forEach(file => {
        console.log(`         - ${file}`);
      });
    });

    const endTime = performance.now();
    console.log(`\n⏱️  Tahlil vaqti: ${(endTime - this.startTime).toFixed(2)}ms`);
  }

  /**
   * Asosiy tahlil jarayoni
   */
  async run() {
    console.log('🚀 Performance analyzer ishga tushmoqda...\n');
    
    const backendPath = path.join(__dirname, '..');
    this.results = this.analyzeDirectory(backendPath);
    
    this.printResults();
  }
}

// Faylni to'g'ridan-to'g'ri ishga tushirish
if (require.main === module) {
  const analyzer = new PerformanceAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = PerformanceAnalyzer;