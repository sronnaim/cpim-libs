export type WorkOrderDetail = {
    id: string,
    order_code: string,
    sales_order_id: string,
    city: string
    province: string,
    area: string
    contact_name: string,
    address: string,
    contact_mobile: string,
    dealer_name: string,
    creator_name: string,
    car_series: string,
    dateCreated: string
}

export type SalesOrder = {
    id: string,
    sales_order_code: string,
    member_name: string,
    vin: string,
    series_name: string,
    dealer_code: string,
    dealer_name: string,
    status: string,
    dateCreated: string
}

export type SalesOrderResponse = {
    total: number,
    size: number
    data: SalesOrder[]
}

export type WorkOrderFromSupplier = {
    id: string,
    order_code: string,
    dateCreated: string,
    car_series: string,
    vin: string
    province: string,
    city: string,
    area: string,
    address: string,
    contact_name: string,
    contact_mobile: string,
    dealer_name: string,
}

export type SupplierResponse = {
    errno: number,
    errmsg: string,
    data: {
        total: number,
        size: number,
        data: WorkOrderFromSupplier[]
    }
}

export type ErrorResponse = {
    msg: string,
    ret: number
}

export function isErrorResponse(obj: unknown): obj is ErrorResponse {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'msg' in obj &&
        'ret' in obj
    )
}

export type IwoodsMonitoringData = {
    id: number,
    no_agenda: string,
    nik: string,
    nama_pelanggan: string,
    email: string,
    nomor_rangka: string,
    alamat: string,
    nama_dealer: string,
    tgl_approve_atpm: string | null | undefined,
    status_terakhir_pbpd: string,
    created_at: string,
}

export type IwoodsMonitoringResponse = {
    status: number,
    message: string,
    data: IwoodsMonitoringData[],
    totalElements: number,
    totalPages: number,
    number: number,
}

export type IwoodsWODetailResponse = {
    status: number,
    message: string,
    data: IwoodsTask[]
}

export type IwoodsTask = {
    no_agenda: number,
    keterangan: string,
    tgl_transaksi: string,
    alasan: string | null
}