const { ObjectId } = require('mongodb');
const { getHabitsCollection } = require('../config/db');

function toHabitDocument(habit) {
    if (!habit) return null;
    return {
        ...habit,
        id: habit._id.toString(),
        _id: habit._id.toString(),
        userId: habit.userId || null
    };
}

function requireAuthOwner(owner) {
    if (!owner || !owner.id || !owner.username) {
        throw new Error('Authentication required');
    }
    return owner;
}

async function createHabit(habitData, owner) {
    try {
        const authOwner = requireAuthOwner(owner);
        const { name, category, description, goal } = habitData;

        if (!name || !category || !goal) {
            throw new Error('Missing required fields: name, category, goal');
        }

        const habit = {
            userId: authOwner.id,
            ownerUsername: authOwner.username,
            name,
            category,
            description,
            goal: parseInt(goal, 10),
            createdDate: new Date().toISOString().split('T')[0],
            completedDates: [],
            totalCompleted: 0,
            updatedAt: new Date()
        };

        const habitsCollection = getHabitsCollection();
        const result = await habitsCollection.insertOne(habit);
        const savedHabit = { _id: result.insertedId, ...habit };

        return {
            success: true,
            habitId: result.insertedId,
            habit: toHabitDocument(savedHabit)
        };
    } catch (error) {
        console.error('Error creating habit:', error);
        throw error;
    }
}

async function getAllHabits(userId, category = null) {
    try {
        const query = { userId };
        if (category && category !== 'all') {
            query.category = category;
        }

        const habitsCollection = getHabitsCollection();
        const habits = await habitsCollection.find(query).toArray();

        return {
            success: true,
            count: habits.length,
            habits: habits.map(toHabitDocument)
        };
    } catch (error) {
        console.error('Error fetching habits:', error);
        throw error;
    }
}

async function getHabitById(id, userId) {
    try {
        if (!ObjectId.isValid(id)) {
            throw new Error('Invalid habit ID');
        }

        const habitsCollection = getHabitsCollection();
        const habit = await habitsCollection.findOne({
            _id: new ObjectId(id),
            userId
        });

        if (!habit) {
            throw new Error('Habit not found');
        }

        return {
            success: true,
            ...toHabitDocument(habit)
        };
    } catch (error) {
        console.error('Error fetching habit:', error);
        throw error;
    }
}

async function updateHabit(id, updateData, userId) {
    try {
        if (!ObjectId.isValid(id)) {
            throw new Error('Invalid habit ID');
        }

        const { name, category, description, goal } = updateData;

        if (!name || !category || !goal) {
            throw new Error('Missing required fields: name, category, goal');
        }

        const update = {
            name,
            category,
            description,
            goal: parseInt(goal, 10),
            updatedAt: new Date()
        };

        const habitsCollection = getHabitsCollection();
        const result = await habitsCollection.findOneAndUpdate(
            { _id: new ObjectId(id), userId },
            { $set: update },
            { returnDocument: 'after' }
        );

        const updatedHabit = result.value || result;
        if (!updatedHabit) {
            throw new Error('Habit not found');
        }

        return {
            success: true,
            ...toHabitDocument(updatedHabit)
        };
    } catch (error) {
        console.error('Error updating habit:', error);
        throw error;
    }
}

async function completeHabit(id, userId) {
    try {
        if (!ObjectId.isValid(id)) {
            throw new Error('Invalid habit ID');
        }

        const today = new Date().toISOString().split('T')[0];
        const habitsCollection = getHabitsCollection();

        const habit = await habitsCollection.findOne({
            _id: new ObjectId(id),
            userId
        });

        if (!habit) {
            throw new Error('Habit not found');
        }

        if (habit.completedDates.includes(today)) {
            throw new Error('Habit already completed today');
        }

        const result = await habitsCollection.findOneAndUpdate(
            { _id: new ObjectId(id), userId },
            {
                $push: { completedDates: today },
                $inc: { totalCompleted: 1 },
                $set: { updatedAt: new Date() }
            },
            { returnDocument: 'after' }
        );

        const updatedHabit = result.value || result;
        return {
            success: true,
            ...toHabitDocument(updatedHabit)
        };
    } catch (error) {
        console.error('Error completing habit:', error);
        throw error;
    }
}

async function deleteHabit(id, userId) {
    try {
        if (!ObjectId.isValid(id)) {
            throw new Error('Invalid habit ID');
        }

        const habitsCollection = getHabitsCollection();
        const result = await habitsCollection.findOneAndDelete({
            _id: new ObjectId(id),
            userId
        });

        const deletedHabit = result.value || result;
        if (!deletedHabit) {
            throw new Error('Habit not found');
        }

        return {
            success: true,
            deletedHabit: toHabitDocument(deletedHabit)
        };
    } catch (error) {
        console.error('Error deleting habit:', error);
        throw error;
    }
}

async function getStats(userId) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const habitsCollection = getHabitsCollection();

        const habits = await habitsCollection.find({ userId }).toArray();
        const totalHabits = habits.length;
        const completedToday = habits.filter((h) => h.completedDates.includes(today)).length;
        const progress = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

        const statsByCategory = {};
        let totalCompletions = 0;
        let longestStreak = 0;

        const last7DaysMap = {};
        for(let i=0; i<7; i++) {
             let d = new Date();
             d.setDate(d.getDate() - i);
             last7DaysMap[d.toISOString().split('T')[0]] = 0;
        }

        const last8WeeksMap = Array(8).fill(0);
        const nowMs = Date.now();
        const weekMs = 7 * 24 * 60 * 60 * 1000;

        habits.forEach((habit) => {
            if (!statsByCategory[habit.category]) {
                statsByCategory[habit.category] = { total: 0, completedToday: 0 };
            }
            statsByCategory[habit.category].total++;
            if (habit.completedDates.includes(today)) {
                statsByCategory[habit.category].completedToday++;
            }
            
            totalCompletions += habit.completedDates.length;
            
            habit.completedDates.forEach(dateStr => {
                 if(last7DaysMap[dateStr] !== undefined) {
                     last7DaysMap[dateStr]++;
                 }
                 
                 const dateMs = new Date(dateStr).getTime();
                 const diffMs = nowMs - dateMs;
                 const weekIndex = Math.floor(diffMs / weekMs);
                 if(weekIndex >= 0 && weekIndex < 8) {
                     last8WeeksMap[7 - weekIndex]++;
                 }
            });
            
            if(habit.completedDates.length > 0) {
                 const dates = [...habit.completedDates].sort((a,b)=>new Date(a)-new Date(b));
                 let cur = 1;
                 let max = 1;
                 for(let i=1; i<dates.length; i++) {
                      const prev = new Date(dates[i-1]);
                      const curr = new Date(dates[i]);
                      const diff = Math.round((curr - prev) / (1000*60*60*24));
                      if(diff === 1) { cur++; max = Math.max(max, cur); }
                      else if(diff > 1) { cur = 1; }
                 }
                 longestStreak = Math.max(longestStreak, max);
            }
        });

        const last7Days = Object.keys(last7DaysMap).sort().map(k => last7DaysMap[k]);

        return {
            success: true,
            totalHabits,
            completedToday,
            todayProgress: `${progress}%`,
            statsByCategory,
            last7Days,
            last8Weeks: last8WeeksMap,
            totalCompletions,
            longestStreak
        };
    } catch (error) {
        console.error('Error fetching stats:', error);
        throw error;
    }
}

module.exports = {
    createHabit,
    getAllHabits,
    getHabitById,
    updateHabit,
    completeHabit,
    deleteHabit,
    getStats
};
