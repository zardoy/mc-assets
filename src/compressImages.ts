import imagemin from 'imagemin'
import imageminOptipng from 'imagemin-optipng'

const main = async () => {
    const files = await imagemin(['dist/*.png'], {
        destination: 'dist',
        plugins: [
            imageminOptipng({
                optimizationLevel: 7,
            }),
        ],
    })

    console.log('Compressed images:', files.length)
}

main()
