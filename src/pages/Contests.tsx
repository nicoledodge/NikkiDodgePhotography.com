import Heading from "../components/Contests/Heading.tsx";
import SearchForm from "../components/Contests/SearchForm.tsx";
import Photos from "../components/Contests/Photos.tsx";
import ContestWin from "../components/Contests/ContestWin.tsx";

function Contests() {
    return <>
        <Heading/>
        <SearchForm />
        <Photos />
        <ContestWin />
    </>
}

export default Contests;