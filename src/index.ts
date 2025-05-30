import { checkUpdates, dumpIwoods, dumpSupabaseToSheets, getNewest, logInToIWoods } from "./iwoods";
import supabase from "./supabase";
import { IwoodsItem } from "./types";

const main = async () => {
    const token = await logInToIWoods()
    if (!token) {
        console.error("Could not log in, exiting")
        process.exit(1)
    }
    
    const newWo = await getNewest(token)
    console.log(newWo)
    
    const updated = await checkUpdates(token)
    console.log(updated)

    await dumpIwoods(token)

    const dumped = await dumpSupabaseToSheets()
    console.log(dumped)

    // const { error, data, count } = await supabase
    //     .from("iwoods-items")
    //     .select('*')
    //     .is('electricityInstallDate', null)
    //     .is('isOn', true)
    //     .order('id', { ascending: true })
    //     .overrideTypes<IwoodsItem[]>()


    // console.log(data)
}

main().catch(
    (err) => {
        console.error(err)
        process.exit(1)
    }
)