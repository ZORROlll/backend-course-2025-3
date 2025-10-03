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
            if (!fs.existsSync(this.inputFile)) {
                throw new Error('Cannot find input file');
            }
            
            const rawData = fs.readFileSync(this.inputFile, 'utf8');
            this.data = JSON.parse(rawData);
        } catch (error) {
            if (error.message === 'Cannot find input file') {
                throw error;
            }
            console.error('❌ Помилка завантаження даних:', error.message);
        }
    }

    // НОВІ МЕТОДИ ДЛЯ ГНУЧКОСТІ
    getMFO(manager) {
        return manager.MFO || manager.mfo || manager.bank_code || '';
    }

    isNormalBank(manager) {
        const codState = manager.COD_STATE || manager.state_code;
        const nameState = manager.NAME_STATE || manager.state_name;
        
        return codState === 1 || 
               nameState === 'Нормальний' || 
               nameState === 'Normal' ||
               nameState === 'Активний';
    }

    getFullName(manager) {
        const lastName = manager.LAST_NAME || manager.last_name || manager.surname || '';
        const firstName = manager.FIRST_NAME || manager.first_name || manager.name || '';
        const middleName = manager.MIDDLE_NAME || manager.middle_name || '';
        
        return `${lastName} ${firstName} ${middleName}`.trim();
    }

    getPosition(manager) {
        return manager.NAME_DOLGN || manager.position || manager.dolgn || 'Посада не вказана';
    }

    getBankName(manager) {
        return manager.SHORTNAME || manager.bank_name || manager.bank || 'Банк не вказаний';
    }

    getGeneralStats() {
        const totalManagers = this.data.length;
        const activeBanks = this.data.filter(item => this.isNormalBank(item)).length;
        const liquidatedBanks = this.data.filter(item => 
            item.NAME_STATE === 'Режим ліквідації' || 
            item.state_name === 'Режим ліквідації'
        ).length;
        const excludedBanks = this.data.filter(item => 
            (item.NAME_STATE && item.NAME_STATE.includes('Виключено')) ||
            (item.state_name && item.state_name.includes('Виключено'))
        ).length;

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
            const position = this.getPosition(manager);
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
            const bank = this.getBankName(manager);
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
        
        return this.data.filter(manager => {
            const managerLastName = manager.LAST_NAME || manager.last_name || manager.surname || '';
            return managerLastName.toLowerCase().includes(lastName.toLowerCase());
        });
    }

    getYearlyStats() {
        const yearly = {};
        
        this.data.forEach(manager => {
            const dateField = manager.DATE_BANK || manager.date_bank || manager.date;
            if (dateField) {
                try {
                    const date = new Date(dateField);
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

    // ОНОВЛЕНИЙ МЕТОД ДЛЯ ЧАСТИНИ 2
    formatStats(options = {}) {
        let result = '';
        
        // Фільтруємо дані за параметром -n
        let filteredData = this.data;
        if (options.normal) {
            filteredData = this.data.filter(manager => this.isNormalBank(manager));
        }

        // Групуємо менеджерів по банках
        const banks = {};
        
        filteredData.forEach(manager => {
            const bankKey = this.getBankName(manager);
            const mfo = this.getMFO(manager);
            
            if (!banks[bankKey]) {
                banks[bankKey] = {
                    mfo: mfo,
                    managers: []
                };
            }
            
            banks[bankKey].managers.push(manager);
        });

        // Форматуємо вивід
        result += '📈 СПИСОК БАНКІВ ТА МЕНЕДЖЕРІВ\n';
        result += '='.repeat(50) + '\n\n';

        Object.entries(banks).forEach(([bankName, bankData]) => {
            // Додаємо МФО якщо вказано параметр -m
            if (options.mfo && bankData.mfo) {
                result += `${bankData.mfo} `;
            }
            result += `${bankName}\n`;
            
            // Виводимо менеджерів цього банку
            bankData.managers.forEach(manager => {
                result += `  • ${this.getFullName(manager)}`;
                result += ` - ${this.getPosition(manager)}\n`;
            });
            
            result += '\n';
        });

        return result;
    }
}

// Створення програми Commander
const program = new Command();

program
    .name('bank-analyzer')
    .description('CLI для аналізу даних банківських менеджерів')
    .version('1.0.0')
    .option('-i, --input <file>', 'шлях до вхідного JSON файлу (обовʼязковий)')
    .option('-o, --output <file>', 'шлях до файлу для запису результату')
    .option('-d, --display', 'вивести результат у консоль')
    .option('-m, --mfo', 'відображати код МФО банку перед назвою')
    .option('-n, --normal', 'відображати лише працюючі банки зі статусом "Нормальний"');

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
    
    if (analyzer.data.length === 0) {
        console.error('❌ Не вдалося завантажити дані для аналізу');
        process.exit(1);
    }

    // ВИКОРИСТОВУЄМО НОВИЙ МЕТОД З ПАРАМЕТРАМИ
    const result = analyzer.formatStats({
        mfo: options.mfo,
        normal: options.normal
    });

    // ЛОГІКА ВИВОДУ
    const shouldDisplay = options.display;
    const outputFile = options.output;

    if (!shouldDisplay && !outputFile) {
        process.exit(0);
    }

    if (shouldDisplay && !outputFile) {
        console.log(result);
    }

    if (!shouldDisplay && outputFile) {
        try {
            fs.writeFileSync(outputFile, result, 'utf8');
            console.log(`✅ Результат записано у файл: ${outputFile}`);
        } catch (error) {
            console.error('❌ Помилка запису у файл:', error.message);
        }
    }

    if (shouldDisplay && outputFile) {
        console.log(result);
        try {
            fs.writeFileSync(outputFile, result, 'utf8');
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