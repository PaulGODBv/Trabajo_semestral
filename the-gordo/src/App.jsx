import { useEffect } from 'react'
import { getMesas } from '../src/services/mesasService'

function Home() {
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await getMesas()
      console.log(data, error)
    }

    fetchData()
  }, [])

  return <h1>Home</h1>
}

export default Home