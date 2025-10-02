import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BankManagersAnalyzer {
    constructor() {
        this.data = [];
        this.loadData();
    }

    // Завантаження даних з JSON файлу
    loadData() {
        try {
            const filePath = path.join(__dirname, 'bank_managers.json');
            
            if (!fs.existsSync(filePath)) {
                console.log('❌ Файл bank_managers.json не знайдено!');
                console.log('❌ Переконайтеся, що файл знаходиться в папці:', __dirname);
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

    // Загальна статистика
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

    // Топ посади
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

    // Топ банки за кількістю менеджерів
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

    // Пошук менеджерів за прізвищем
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

    // Аналіз за роками
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

    // Статистика за статусами банків
    getBankStatusStats() {
        const statuses = {};
        
        this.data.forEach(manager => {
            const status = manager.NAME_STATE || 'Не вказано';
            statuses[status] = (statuses[status] || 0) + 1;
        });

        return Object.entries(statuses)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => ({ status, count }));
    }

    // Вивід статистики
    printStats() {
        console.log('\n📈 СТАТИСТИКА БАНКІВСЬКИХ МЕНЕДЖЕРІВ');
        console.log('='.repeat(50));

        const stats = this.getGeneralStats();
        console.log(`\n📊 Загальна статистика:`);
        console.log(`   • Всього менеджерів: ${stats.totalManagers}`);
        console.log(`   • Банків з нормальним статусом: ${stats.activeBanks}`);
        console.log(`   • Банків у режимі ліквідації: ${stats.liquidatedBanks}`);
        console.log(`   • Банків виключено з реєстру: ${stats.excludedBanks}`);

        console.log(`\n🏆 Топ-10 посад:`);
        const topPositions = this.getTopPositions(10);
        topPositions.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.position}: ${item.count}`);
        });

        console.log(`\n🏦 Топ-10 банків за кількістю менеджерів:`);
        const topBanks = this.getTopBanks(10);
        topBanks.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.bank}: ${item.count} менеджерів`);
        });

        console.log(`\n📅 Розподіл за роками призначення:`);
        const yearlyStats = this.getYearlyStats();
        if (yearlyStats.length > 0) {
            yearlyStats.forEach(item => {
                console.log(`   • ${item.year} рік: ${item.count} призначень`);
            });
        } else {
            console.log(`   • Дані про дати відсутні`);
        }

        console.log(`\n🏛️ Статуси банків:`);
        const statusStats = this.getBankStatusStats();
        statusStats.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.status}: ${item.count}`);
        });
    }
}

// Головна функція
function main() {
    console.log('🚀 Запуск аналізу банківських менеджерів...\n');
    
    const analyzer = new BankManagersAnalyzer();
    
    if (analyzer.data.length === 0) {
        console.log('❌ Не вдалося завантажити дані для аналізу');
        console.log('❌ Переконайтеся, що файл bank_managers.json знаходиться в тій самій папці');
        return;
    }

    // Вивід статистики
    analyzer.printStats();

    // Демонстрація пошуку
    console.log('\n🔍 Демонстрація пошуку:');
    const sampleSearch = analyzer.findManagerByLastName('Іван');
    if (sampleSearch.length > 0) {
        console.log(`   • Знайдено ${sampleSearch.length} менеджерів з прізвищем, що містить "Іван"`);
        console.log('   • Приклад:');
        sampleSearch.slice(0, 3).forEach((manager, idx) => {
            console.log(`     ${idx + 1}. ${manager.LAST_NAME} ${manager.FIRST_NAME} - ${manager.NAME_DOLGN}`);
        });
    }

    console.log('\n💡 Корисні команди для подальшого аналізу:');
    console.log('   • analyzer.findManagerByLastName("Прізвище")');
    console.log('   • analyzer.getTopPositions(5)');
    console.log('   • analyzer.getTopBanks(5)');
    console.log('   • analyzer.getYearlyStats()');
}

// Запуск програми
main();

export default BankManagersAnalyzer;