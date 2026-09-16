import 'dotenv/config'
import mongoose from 'mongoose'

const equipment = [
    { equipmentId: 'CAM-014', name: 'Sony A7 IV', category: 'Cameras', totalUnits: 6, availableUnits: 6, depositAmount: 2500, lateFeePerDay: 100 },
    { equipmentId: 'PRO-008', name: 'Epson EB-X06', category: 'Projectors', totalUnits: 4, availableUnits: 4, depositAmount: 1500, lateFeePerDay: 75 },
    { equipmentId: 'AUD-022', name: 'Rode Wireless GO II', category: 'Audio', totalUnits: 10, availableUnits: 10, depositAmount: 1000, lateFeePerDay: 50 },
    { equipmentId: 'LGT-004', name: 'Aputure Amaran 200x', category: 'Lighting', totalUnits: 8, availableUnits: 8, depositAmount: 1200, lateFeePerDay: 60 },
]
const schema = new mongoose.Schema(equipment[0])
const Equipment = mongoose.model('Equipment', schema)
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/av-room')
await Equipment.deleteMany({})
await Equipment.insertMany(equipment)
console.log(`Seeded ${equipment.length} equipment records`)
await mongoose.disconnect()
