import firebaseUtils from './firebase-util'

class FunctionApi {
  async loadCompanies(userId: string) {
    const response = await firebaseUtils.function('usersMe', { userId })
    return response.data.user.companies
  }

  async getAccountItems(userId: string, companyId: string) {
    const response = await firebaseUtils.function('accountItems', {
      userId,
      companyId
    })
    return response.data.account_items
  }

  async postDeal(userId: string, companyId: string, params: any) {
    const response = await firebaseUtils.function('postDeal', {
      userId,
      companyId,
      params
    })
    return response.data
  }

  async postReceipt(userId: string, companyId: string, params: any) {
    console.log(' postreceipt function作動 from function-api.tsです。')
    const response = await firebaseUtils.function('postReceipt', {
      userId,
      companyId,
      params
    })
    return response.data
  }
}

export const FunctionAPI = new FunctionApi()
