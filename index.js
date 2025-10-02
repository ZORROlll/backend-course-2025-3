import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BankManagersAnalyzer {
    constructor() {
        this.data = [];
        this.loadData();
    }

    loadData() {
        try {
            const filePath = path.join(__dirname, 'bank_managers.json');
            
            if (!fs.existsSync(filePath)) {
                console.log('❌ Файл bank_managers.json не знайдено!');
                return;
            }
            
            const rawData = fs.readFileSync(filePath, 'utf8');
            this.data = JSON.parse(rawData);
            console.log('✅ Дані успішно завантажено!');
            console.log(`📊 Загальна кількість записів: ${this.data.length}`);
        } catch (error) {
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
}

// Створення програми Commander
const program = new Command();
const analyzer = new BankManagersAnalyzer();

program
    .name('bank-analyzer')
    .description('CLI для аналізу даних банківських менеджерів')
    .version('1.0.0');

// Команда для загальної статистики
program
    .command('stats')
    .description('Показати загальну статистику')
    .action(() => {
        if (analyzer.data.length === 0) {
            console.log('❌ Дані не завантажені!');
            return;
        }

        const stats = analyzer.getGeneralStats();
        console.log('\n📈 ЗАГАЛЬНА СТАТИСТИКА');
        console.log('='.repeat(30));
        console.log(`👥 Всього менеджерів: ${stats.totalManagers}`);
        console.log(`✅ Банків з нормальним статусом: ${stats.activeBanks}`);
        console.log(`🔚 Банків у режимі ліквідації: ${stats.liquidatedBanks}`);
        console.log(`❌ Банків виключено з реєстру: ${stats.excludedBanks}`);
    });

// Команда для топ посад
program
    .command('positions')
    .description('Показати топ посад')
    .option('-l, --limit <number>', 'кількість позицій для показу', '10')
    .action((options) => {
        if (analyzer.data.length === 0) {
            console.log('❌ Дані не завантажені!');
            return;
        }

        const limit = parseInt(options.limit);
        const positions = analyzer.getTopPositions(limit);
        
        console.log(`\n🏆 ТОП-${limit} ПОСАД`);
        console.log('='.repeat(30));
        positions.forEach((item, index) => {
            console.log(`${index + 1}. ${item.position}: ${item.count}`);
        });
    });

// Команда для топ банків
program
    .command('banks')
    .description('Показати топ банків')
    .option('-l, --limit <number>', 'кількість банків для показу', '10')
    .action((options) => {
        if (analyzer.data.length === 0) {
            console.log('❌ Дані не завантажені!');
            return;
        }

        const limit = parseInt(options.limit);
        const banks = analyzer.getTopBanks(limit);
        
        console.log(`\n🏦 ТОП-${limit} БАНКІВ`);
        console.log('='.repeat(30));
        banks.forEach((item, index) => {
            console.log(`${index + 1}. ${item.bank}: ${item.count} менеджерів`);
        });
    });

// Команда для пошуку за прізвищем
program
    .command('search <lastName>')
    .description('Пошук менеджерів за прізвищем')
    .action((lastName) => {
        if (analyzer.data.length === 0) {
            console.log('❌ Дані не завантажені!');
            return;
        }

        const results = analyzer.findManagerByLastName(lastName);
        
        console.log(`\n🔍 РЕЗУЛЬТАТИ ПОШУКУ: "${lastName}"`);
        console.log('='.repeat(40));
        
        if (results.length === 0) {
            console.log('❌ Менеджерів не знайдено');
        } else {
            console.log(`✅ Знайдено ${results.length} менеджерів:\n`);
            results.slice(0, 20).forEach((manager, index) => {
                console.log(`${index + 1}. ${manager.LAST_NAME} ${manager.FIRST_NAME} ${manager.MIDDLE_NAME || ''}`);
                console.log(`   Посада: ${manager.NAME_DOLGN}`);
                console.log(`   Банк: ${manager.SHORTNAME}`);
                console.log(`   Статус: ${manager.NAME_STATE}`);
                console.log('   ──────────────────────');
            });
            
            if (results.length > 20) {
                console.log(`... і ще ${results.length - 20} результатів`);
            }
        }
    });

// Команда для статистики за роками
program
    .command('years')
    .description('Показати статистику за роками')
    .action(() => {
        if (analyzer.data.length === 0) {
            console.log('❌ Дані не завантажені!');
            return;
        }

        const yearlyStats = analyzer.getYearlyStats();
        
        console.log('\n📅 СТАТИСТИКА ЗА РОКАМИ');
        console.log('='.repeat(30));
        
        if (yearlyStats.length === 0) {
            console.log('❌ Дані про дати відсутні');
        } else {
            yearlyStats.forEach(item => {
                console.log(`📅 ${item.year} рік: ${item.count} призначень`);
            });
        }
    });

// Запуск парсингу аргументів
program.parse();

export default BankManagersAnalyzer;