export type WorkOrder = {
    id: string,
    iwoodItemId?: number,
    wmsItemId?: number
    orderCode: string,
    orderCreated: Date,
    createdDate: Date,
    customerName: string,
    customerContactNumber: string,
    customerAddress: string,
    dealerName: string,
    carSeries: string,
    vin: string,
}

export type IwoodsItem = {
    id: number,
    agendaNumber?: string,
    iwoodsInputDate: Date,
    iwoodsApproveDate?: Date,
    isOn: boolean,
    electricityInstallDate?: Date | string,
    vin: string,
}

export type WmsItem = {
    id: number,
    address?: string,
    requestType?: string,
    networkType?: string,
    chargerSN?: string,
    technicianName?: string,
    chargerInstallDate?: Date
}