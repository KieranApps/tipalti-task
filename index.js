import { EXPENSES } from './expenses.js';

import { startApproval, nextApprovers, approve, reject, dumpFlow } from './approval.js';


for (const expense of EXPENSES) {
    if (!expense.id) {
        console.log('Expense doesn\'t exist'); // If someone called the would be end point incorrectly, throw an error
        continue;
    }

    const started = startApproval(expense);
    if (!started) {
        // Error with expense, skip
        console.log('Error with expense');
        continue;
    }

    let approved = false;
    while (!approved) {
        const approvers = nextApprovers(expense.id);
        const rejectChance = Math.random();
        // Randomly reject to show that function working
        if (rejectChance > 0.85) {
            approved = reject(expense.id, approvers[0]);// For simplicity take first index. Will lead to dupe approvals, but can be fixed with a filter to remove own ID from approvers list (if length > 0) 
                                                        // Relevant to expese 6
        } else {
            approved = approve(expense.id, approvers[0]);
        }

        dumpFlow(expense.id);
    }
}