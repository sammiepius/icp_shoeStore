import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt, int, float32, int8, int16 } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Shoe = Record<{
    id: string;
    name: string;
    size: string;
    shoeURL: string;
    price: int16;
    quantity: string
    rating: float32;
    createdAt: nat64;
    updatedAt: Opt<nat64>;
}>

type ShoePayload = Record<{
    name: string;
    size: string;
    shoeURL: string;
    price: int16;
    quantity: string;
    // rating:float32;
}>

const shoeStorage = new StableBTreeMap<string, Shoe>(0, 44, 1024)

$update;
export function createShoe(payload: ShoePayload): Result<Shoe, string> {
    const shoe: Shoe = { id: uuidv4(), createdAt: ic.time(),rating: 1.0,updatedAt: Opt.None, ...payload };
    shoeStorage.insert(shoe.id, shoe);
    return Result.Ok(shoe);
}

// gets all the shoes in the store
$query
export function getShoe(): Vec<Shoe> {
    return shoeStorage.values();
}

//gets a particular shoe using the shoe's id
$query;
export function getShoeById(id: string): Result<Shoe, string> {
    return match(shoeStorage.get(id), {
        Some: (shoe) => Result.Ok<Shoe, string>(shoe),
        //throws an Error when a shoe with the id is not found
        None: () => Result.Err<Shoe, string>(`a shoe with id=${id} not found`)
    });
}

//function that search for a shoe product
$query;
export function searchShoeProduct(keyword: string): Result<Vec<Shoe>, string> {
    const result = shoeStorage.values().filter((shoe) => {
//variable that uses the "name" keyword to search for a particular shoes      
        const value = shoe.name.includes(keyword)
        return value;
    });
    return Result.Ok<Vec<Shoe>, string>(result);
}




// Function for rating a shoe
$update;
export function rateShoe(id: string, rate: number): Result<Shoe, string> {
    
    //make sure the ratin rage is not less than 0 or greater than 4
    if (rate < 0 || rate > 4) {
        return Result.Err<Shoe, string>(
          `Error rating shoe with the id=${id}. Invalid rating value. Value should not be more than 4 or less than 0`
        );
      }
    
    // Gets the shoe details by it's id
    const shoeRating: any = match(shoeStorage.get(id), {
    
    // returns the current rating value 
        Some: (shoe) => {
            return shoe.rating;
        },
        None: () => Result.Err<Shoe, string>(`Error updating shoe with the id=${id}. shoe not found`)
    })

    // Calculates the new rating by adding the current rating to the user's 
    // rating and dividing the result by 4
    const rating: any = ((shoeRating + rate) / 4);

    return match(shoeStorage.get(id), {
        Some: (result) => {
            const shoe: Shoe = {
                ...result,
                rating,
            };
            shoeStorage.insert(shoe.id, shoe);
            return Result.Ok<Shoe, string>(shoe);
        },
        None: () => Result.Err<Shoe, string>(`Error rating shoe with the id=${id}. shoe not found`)
    });
}

//delete a specific show using the show id
$update;
export function deleteShoe(id: string): Result<Shoe, string> {
    return match(shoeStorage.remove(id), {
        Some: (deletedShoe) => Result.Ok<Shoe, string>(deletedShoe),
        None: () => Result.Err<Shoe, string>(`couldn't delete a shoe with id=${id}. shoe not found.`)
    });
}



$update;
export function updateStore(id: string, payload: ShoePayload): Result<Shoe, string> {
    return match(shoeStorage.get(id), {
        Some: (shoe) => {
            const updatedStore: Shoe = {...shoe, ...payload, updatedAt: Opt.Some(ic.time())};
            shoeStorage.insert(shoe.id, updatedStore);
            return Result.Ok<Shoe, string>(updatedStore);
        },
        None: () => Result.Err<Shoe, string>(`couldn't update a shoe with id=${id}. shoe not found`)
    });
}

// a workaround to make uuid package work with Azle
globalThis.crypto = {
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    }
};

