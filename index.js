import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BankManagersAnalyzer {
    constructor(inputFile) {
        this.data = [];
        this.inputFile = inputFile;
        this.loadData();
    }

   loadData() {
    try {
        // Перевіряємо чи файл існує
        if (!fs.existsSync(this.inputFile)) {
            throw new Error('Cannot find input file');
        }
        
        const rawData = fs.readFileSync(this.inputFile, 'utf8');
        this.data = JSON.parse(rawData);
        // ВИДАЛИВ console.log - НІЧОГО НЕ ВИВОДИТИ!
    } catch (error) {
        if (error.message === 'Cannot find input file') {
            throw error; // Передаємо помилку далі
        }
        console.error('❌ Помилка завантаження даних:', error.message);
    }
}
    getGeneralStats() {
        const totalManagers = this.data.length;
        const activeBanks = this.data.filter(item => item.NAME_STATE === 'Нормальний').length;
        const liquidatedBanks = this.data.filter(item => item.NAME_STATE === 'Режим ліквідації').length;
        const excludedBanks = this.data.filter(item => item.NAME_STATE && item.NAME_STATE.includes('Виключено')).length;

        return {
            totalManagers,
            activeBanks,
            liquidatedBanks,
            excludedBanks
        };
    }

    getTopPositions(limit = 10) {
        const positions = {};
        
        this.data.forEach(manager => {
            const position = manager.NAME_DOLGN || 'Не вказано';
            positions[position] = (positions[position] || 0) + 1;
        });

        return Object.entries(positions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([position, count]) => ({ position, count }));
    }

    getTopBanks(limit = 10) {
        const banks = {};
        
        this.data.forEach(manager => {
            const bank = manager.SHORTNAME || 'Не вказано';
            banks[bank] = (banks[bank] || 0) + 1;
        });

        return Object.entries(banks)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([bank, count]) => ({ bank, count }));
    }

    findManagerByLastName(lastName) {
        if (!lastName || typeof lastName !== 'string') {
            console.log('❌ Будь ласка, введіть коректне прізвище для пошуку');
            return [];
        }
        
        return this.data.filter(manager => 
            manager.LAST_NAME && 
            manager.LAST_NAME.toLowerCase().includes(lastName.toLowerCase())
        );
    }

    getYearlyStats() {
        const yearly = {};
        
        this.data.forEach(manager => {
            if (manager.DATE_BANK) {
                try {
                    const date = new Date(manager.DATE_BANK);
                    if (!isNaN(date.getTime())) {
                        const year = date.getFullYear();
                        yearly[year] = (yearly[year] || 0) + 1;
                    }
                } catch (error) {
                    // Ігноруємо некоректні дати
                }
            }
        });

        return Object.entries(yearly)
            .sort(([yearA], [yearB]) => yearA - yearB)
            .map(([year, count]) => ({ year: parseInt(year), count }));
    }

    // НОВИЙ МЕТОД: отримати всі статистики для виводу
    getAllStats() {
        const stats = this.getGeneralStats();
        const topPositions = this.getTopPositions(10);
        const topBanks = this.getTopBanks(10);
        const yearlyStats = this.getYearlyStats();

        return {
            generalStats: stats,
            topPositions,
            topBanks,
            yearlyStats
        };
    }

    // НОВИЙ МЕТОД: форматувати результат для виводу
    formatStats() {
        const allStats = this.getAllStats();
        let result = '';

        result += '📈 СТАТИСТИКА БАНКІВСЬКИХ МЕНЕДЖЕРІВ\n';
        result += '='.repeat(50) + '\n\n';

        // Загальна статистика
        result += '📊 Загальна статистика:\n';
        result += `   • Всього менеджерів: ${allStats.generalStats.totalManagers}\n`;
        result += `   • Банків з нормальним статусом: ${allStats.generalStats.activeBanks}\n`;
        result += `   • Банків у режимі ліквідації: ${allStats.generalStats.liquidatedBanks}\n`;
        result += `   • Банків виключено з реєстру: ${allStats.generalStats.excludedBanks}\n\n`;

        // Топ посад
        result += '🏆 Топ-10 посад:\n';
        allStats.topPositions.forEach((item, index) => {
            result += `   ${index + 1}. ${item.position}: ${item.count}\n`;
        });
        result += '\n';

        // Топ банків
        result += '🏦 Топ-10 банків за кількістю менеджерів:\n';
        allStats.topBanks.forEach((item, index) => {
            result += `   ${index + 1}. ${item.bank}: ${item.count} менеджерів\n`;
        });
        result += '\n';

        // Роки
        result += '📅 Розподіл за роками призначення:\n';
        if (allStats.yearlyStats.length > 0) {
            allStats.yearlyStats.forEach(item => {
                result += `   • ${item.year} рік: ${item.count} призначень\n`;
            });
        } else {
            result += '   • Дані про дати відсутні\n';
        }

        return result;
    }
}

// Створення програми Commander
const program = new Command();

program
    .name('bank-analyzer')
    .description('CLI для аналізу даних банківських менеджерів')
    .version('1.0.0')
    // ДОДАЄМО СПІЛЬНІ ПАРАМЕТРИ
    .option('-i, --input <file>', 'шлях до вхідного JSON файлу (обовʼязковий)') // ВИДАЛИВ requiredOption
    .option('-o, --output <file>', 'шлях до файлу для запису результату')
    .option('-d, --display', 'вивести результат у консоль');

// Обробка всіх команд
program.parse();

// ОТРИМУЄМО ПАРАМЕТРИ
const options = program.opts();

// ПЕРЕВІРКА ОБОВ'ЯЗКОВОГО ПАРАМЕТРА 
if (!options.input) {
    console.error('❌ Помилка: Please, specify input file');
    process.exit(1);
}

// СПРОБУЄМО ЗАВАНТАЖИТИ ДАНІ
try {
    const analyzer = new BankManagersAnalyzer(options.input);
    
    // Якщо дані не завантажились - виходимо
    if (analyzer.data.length === 0) {
        console.error('❌ Не вдалося завантажити дані для аналізу');
        process.exit(1);
    }

    // ОТРИМУЄМО РЕЗУЛЬТАТ
    const result = analyzer.formatStats();

    // ЛОГІКА ВИВОДУ ЗА ВИМОГАМИ ЛАБИ
    const shouldDisplay = options.display; // чи виводити в консоль
    const outputFile = options.output;     // чи записувати в файл

    // ВАРІАНТ 1: Не задано жодного з необов'язкових параметрів - нічого не робимо
    if (!shouldDisplay && !outputFile) {
        // Нічого не виводимо - просто виходимо
        process.exit(0);
    }

    // ВАРІАНТ 2: Задано тільки -d (display) - виводимо в консоль
    if (shouldDisplay && !outputFile) {
        console.log(result);
    }

    // ВАРІАНТ 3: Задано тільки -o (output) - записуємо в файл
    if (!shouldDisplay && outputFile) {
        try {
            fs.writeFileSync(outputFile, result, 'utf8');
            console.log(`✅ Результат записано у файл: ${outputFile}`);
        } catch (error) {
            console.error('❌ Помилка запису у файл:', error.message);
        }
    }

    // ВАРІАНТ 4: Задано і -d і -o - виводимо і в консоль і в файл
    if (shouldDisplay && outputFile) {
        console.log(result); // Вивід в консоль
        
        try {
            fs.writeFileSync(outputFile, result, 'utf8'); // Запис в файл
            console.log(`✅ Результат також записано у файл: ${outputFile}`);
        } catch (error) {
            console.error('❌ Помилка запису у файл:', error.message);
        }
    }

} catch (error) {
    if (error.message === 'Cannot find input file') {
        console.error('❌ Помилка: Cannot find input file');
        process.exit(1);
    } else {
        console.error('❌ Неочікувана помилка:', error.message);
        process.exit(1);
    }
}

export default BankManagersAnalyzer;