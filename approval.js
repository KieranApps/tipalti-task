// Below functions are the 'async endpoints' that would be exported and used in this were a server using API calls

import { data } from './dataStore.js';

const THRESHOLD = 1000; // Can move to 'constants.js' if in full project

/**
 * Starts the expense approval flow, adding needed information about the expense and its state
 * 
 * @param {Object} expense | Object containing expense info (id, submitterId, amount)
 */
export function startApproval(expense) {
    // Check user exists
    const userExists = data.users.find((user) => {
        return user.uid === expense.submitterId;
    });
    if (!userExists) {
        return false;
    }
    // Check id not in use
    // This would check the expense DB if it exists, but here since its all linear (i.e., one is started the completed) and in the data object, just check pastApprovals
    const expenseExists = data.pastApprovals.find((exp) => {
        return exp.id === expense.id;
    });
    if (expenseExists) {
        return false;
    }

    const approvalData = {
        id: expense.id,
        submitter: expense.submitterId,
        amount: expense.amount,
        state: 'pending',
        nextStep: undefined,
        approvedBy: [],
        rejectedBy: undefined
    };

    data.activeExpenses.push(approvalData);

    return true;
}

// Assuming @approve.com is finance and @tipalti.com is normal employee
/**
 * Get the array of possible next approvers, according to rules avoiding duplicates if possible
 * @param {int} expenseId 
 */
export function nextApprovers(expenseId) {

    const getFinance = () => {
        const finance = data.users.filter(u => u.email.endsWith('@approve.com'));
        return finance.map(f => f.uid);
    }

    const expense = data.activeExpenses.find(ex => {
        return ex.id === expenseId;
    });

    const step = expense.approvedBy.length;

    switch (step) {
        case 1: // Approved by boss
            if (expense.amount >= THRESHOLD) {
                const user = data.users.find(u => u.uid === expense.approvedBy[0]);
                if (user.manager === expense.approvedBy[0]) {
                    // If manager is who just approved, move to finance
                    expense.nextStep = 'finance';
                    return getFinance();
                }
                expense.nextStep = 'boss';
                return [user.manager]
            }
            expense.nextStep = 'finance';
            return getFinance();
            break;
        case 2: // Approved by boss and bosses boss
            expense.nextStep = 'finance';
            return getFinance();
            break;
        default: // Init
            expense.nextStep = 'boss';
            const user = data.users.find(u => u.uid === expense.submitter);
            return [user.manager];
            break;
    }
}

/**
 * Approve the expense for the current stage, marking as approved if process complete
 * @param {int} expenseId 
 * @param {int} approverId 
 * @returns {boolean} true or false, false for needs extra approval, true if complete
 */
export function approve(expenseId, approverId) {
    // Keep simple, base on length of approval flow
    const expense = data.activeExpenses.find(ex => {
        return ex.id === expenseId;
    });
    expense.approvedBy.push(approverId);
    
    const step = expense.approvedBy.length;
    if ((expense.amount >= THRESHOLD && step === 3) ||
        (expense.amount <  THRESHOLD && step === 2) ||
        (expense.nextStep === 'finance'))
    {
        // Complete
        const completedExpense = {...expense};
        completedExpense.state = 'approved';
        data.pastApprovals.push(completedExpense);
        data.activeExpenses = data.activeExpenses.filter((ex => ex.id != expenseId));
        return true;
    }
    return false;
}

/**
 * Mark the provided expense as rejected
 * @param {int} expenseId 
 * @param {int} approverId 
 */
export function reject(expenseId, approverId) {
    const expense = data.activeExpenses.find(ex => {
        return ex.id === expenseId;
    });
    const completedExpense = {...expense};
    completedExpense.state = 'rejected';
    completedExpense.rejectedBy = approverId;
    data.pastApprovals.push(completedExpense);
    data.activeExpenses = data.activeExpenses.filter((ex => ex.id != expenseId));
    return true;
}

// ---- For debug ---- //
export function dumpFlow(expenseId) {
    let expense = data.activeExpenses.find(ex => {
        return ex.id === expenseId;
    });
    if (!expense) {
        expense = data.pastApprovals.find(ex => {
            return ex.id === expenseId;
        });
    }
    console.log('-----------------------------------------');
    console.log(`Approval Flow for expense ${expenseId}:`);
    console.log('State:', expense.state);
    console.log('Current Approvers:', expense.approvedBy);
    console.log('Rejected By: ', expense.rejectedBy);
    console.log('Current Step:', expense.nextStep);
    console.log('Amount: ', expense.amount);
    console.log('Submitted by: ', expense.submitter);
    console.log('-----------------------------------------');
}